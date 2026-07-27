const { goals: { GoalFollow, GoalNear } } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

const { DRAGON_CONFIG, REQUIRED_ITEMS } = require('../data/dragonData');
const { equipTool } = require('../utils/inventory');
const { eatFood } = require('./eatFood');
const { distanceBetween, performBoundedAttack, retreatFromEntity } = require('./combat');

const BUILD_BLOCK_NAMES = [
  'cobblestone',
  'dirt',
  'netherrack',
  'stone'
];

function validEntities(bot, predicate) {
  return Object.values(bot.entities || {}).filter(entity =>
    entity?.isValid !== false && entity.position && predicate(entity)
  );
}

function findDragon(bot) {
  return validEntities(bot, entity => entity.name === 'ender_dragon')[0] || null;
}

function findEndCrystals(bot, range = DRAGON_CONFIG.crystalSearchRange) {
  return validEntities(bot, entity => entity.name === 'end_crystal')
    .filter(entity => distanceBetween(bot.entity?.position, entity.position) <= range)
    .sort((a, b) =>
      distanceBetween(bot.entity?.position, a.position) -
      distanceBetween(bot.entity?.position, b.position)
    );
}

function blockName(bot, position) {
  try {
    return bot.blockAt?.(position)?.name;
  } catch {
    return null;
  }
}

function offset(position, x, y, z) {
  if (typeof position?.offset === 'function') return position.offset(x, y, z);
  return {
    x: Math.floor(position.x) + x,
    y: Math.floor(position.y) + y,
    z: Math.floor(position.z) + z
  };
}

function isCagedCrystal(bot, crystal) {
  return findCageBlocks(bot, crystal).length > 0;
}

function findCageBlocks(bot, crystal) {
  const base = crystal.position?.floored?.() || crystal.position;
  const bars = [];
  for (let y = -1; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      for (let z = -2; z <= 2; z += 1) {
        const position = offset(base, x, y, z);
        const block = bot.blockAt?.(position);
        if (block?.name === 'iron_bars') bars.push(block);
      }
    }
  }
  return bars.sort((a, b) =>
    distanceBetween(bot.entity?.position, a.position) -
    distanceBetween(bot.entity?.position, b.position)
  );
}

function hasAnyItem(bot, names) {
  return (bot.inventory?.items?.() || []).some(item => names.includes(item.name));
}

function readiness(bot) {
  return {
    sword: hasAnyItem(bot, REQUIRED_ITEMS.sword),
    bow: hasAnyItem(bot, REQUIRED_ITEMS.bow),
    arrows: hasAnyItem(bot, REQUIRED_ITEMS.arrows),
    food: hasAnyItem(bot, REQUIRED_ITEMS.food),
    health: bot.health ?? 20,
    hunger: bot.food ?? 20
  };
}

async function equipNamed(bot, names) {
  const item = (bot.inventory?.items?.() || []).find(candidate =>
    names.includes(candidate.name)
  );
  if (!item) return false;
  await bot.equip(item, 'hand');
  return true;
}

function findBuildBlock(bot) {
  return (bot.inventory?.items?.() || []).find(item =>
    BUILD_BLOCK_NAMES.includes(item.name)
  ) || null;
}

function countBuildBlocks(bot) {
  return (bot.inventory?.items?.() || [])
    .filter(item => BUILD_BLOCK_NAMES.includes(item.name))
    .reduce((total, item) => total + item.count, 0);
}

function calculateCrystalApproachPosition(bot, crystal, distance = 7) {
  const botPosition = bot.entity.position;
  const crystalPosition = crystal.position;

  const dx = botPosition.x - crystalPosition.x;
  const dz = botPosition.z - crystalPosition.z;
  const horizontalLength = Math.hypot(dx, dz) || 1;

  return {
    x: Math.floor(
      crystalPosition.x + (dx / horizontalLength) * distance
    ),
    z: Math.floor(
      crystalPosition.z + (dz / horizontalLength) * distance
    )
  };
}

async function pillarUp(bot, targetY, options = {}) {
  const maxHeight = options.maxHeight ?? 20;

  const startY = Math.floor(bot.entity.position.y);
  const requiredHeight = Math.max(
    0,
    Math.ceil(targetY - startY)
  );

  if (requiredHeight === 0) {
    return {
      success: true,
      code: 'PILLAR_NOT_REQUIRED',
      data: { placed: 0 }
    };
  }

  if (requiredHeight > maxHeight) {
    return {
      success: false,
      code: 'PILLAR_HEIGHT_LIMIT_EXCEEDED',
      data: {
        requiredHeight,
        maxHeight
      }
    };
  }

  const availableBlocks = countBuildBlocks(bot);

  if (availableBlocks < requiredHeight) {
    return {
      success: false,
      code: 'PILLAR_BLOCKS_INSUFFICIENT',
      data: {
        requiredHeight,
        availableBlocks
      }
    };
  }

  let placed = 0;

  for (let i = 0; i < requiredHeight; i += 1) {
    const blockItem = findBuildBlock(bot);

    if (!blockItem) {
      return {
        success: false,
        code: 'PILLAR_BLOCK_UNAVAILABLE',
        data: { placed }
      };
    }

    const beforeY = bot.entity.position.y;

    try {
      await bot.equip(blockItem, 'hand');

      const referencePosition = bot.entity.position
        .floored()
        .offset(0, -1, 0);

      const referenceBlock = bot.blockAt(referencePosition);

      if (!referenceBlock || referenceBlock.name === 'air') {
        return {
          success: false,
          code: 'PILLAR_REFERENCE_BLOCK_NOT_FOUND',
          data: {
            placed,
            referencePosition
          }
        };
      }



     await bot.lookAt(
        referenceBlock.position.offset(0.5, 1, 0.5),
        true
      );

      // Pulse jump input instead of holding it continuously.
      bot.setControlState('jump', true);
      await bot.waitForTicks(1);
      bot.setControlState('jump', false);

      // Wait briefly for vertical movement.
      let airborne = false;

      for (let tick = 0; tick < 5; tick += 1) {
        if (
          bot.entity.velocity.y > 0 ||
          bot.entity.position.y > beforeY + 0.15
        ) {
          airborne = true;
          break;
        }

        await bot.waitForTicks(1);
      }

      if (!airborne) {
        return {
          success: false,
          code: 'PILLAR_JUMP_FAILED',
          data: {
            placed,
            beforeY,
            currentY: bot.entity.position.y
          }
        };
      }

      await bot.placeBlock(
        referenceBlock,
        new Vec3(0, 1, 0)
      );

      // Wait only until the bot reaches the block.
      let climbed = false;

      for (let tick = 0; tick < 8; tick += 1) {
        if (bot.entity.position.y >= beforeY + 0.8) {
          climbed = true;
          break;
        }

        await bot.waitForTicks(1);
      }

      if (!climbed) {
        return {
          success: false,
          code: 'PILLAR_POSITION_NOT_UPDATED',
          data: {
            placed,
            beforeY,
            afterY: bot.entity.position.y
          }
        };
      }

      placed += 1;

    } catch (error) {
      bot.setControlState('jump', false);

      return {
        success: false,
        code: 'PILLAR_BUILD_FAILED',
        data: {
          placed,
          error: error.message
        }
      };
    }
  }

  return {
    success: true,
    code: 'PILLAR_BUILT',
    data: { placed }
  };
}

async function prepareCrystalShotPosition(bot, crystal, options = {}) {
  const approachDistance = options.approachDistance ?? 7;
  const shootingHeightOffset = options.shootingHeightOffset ?? 2;
  const maxPillarHeight = options.maxPillarHeight ?? 20;

  const approach = calculateCrystalApproachPosition(
    bot,
    crystal,
    approachDistance
  );

  try {
    await bot.pathfinder.goto(
      new GoalNear(
        approach.x,
        Math.floor(bot.entity.position.y),
        approach.z,
        2
      )
    );

    bot.pathfinder.setGoal(null);
  } catch (error) {
    bot.pathfinder.setGoal(null);

    return {
      success: false,
      code: 'CRYSTAL_APPROACH_FAILED',
      data: {
        approach,
        crystalPosition: crystal.position,
        error: error.message
      }
    };
  }

  const targetY = Math.max(
    Math.floor(bot.entity.position.y),
    Math.floor(
      crystal.position.y - shootingHeightOffset
    )
  );

  const pillarResult = await pillarUp(bot, targetY, {
    maxHeight: maxPillarHeight
  });

  if (!pillarResult.success) {
    return pillarResult;
  }

  const shotDistance = distanceBetween(
    bot.entity.position,
    crystal.position
  );

  if (shotDistance < 6) {
    return {
      success: false,
      code: 'CRYSTAL_SHOT_POSITION_TOO_CLOSE',
      data: {
        distance: shotDistance,
        crystalPosition: crystal.position
      }
    };
  }

  return {
    success: true,
    code: 'CRYSTAL_SHOT_POSITION_READY',
    data: {
      approach,
      targetY,
      distance: shotDistance,
      placed: pillarResult.data.placed
    }
  };
}


async function waitForInvalid(bot, entity, ticks = 60) {
  for (let elapsed = 0; elapsed < ticks; elapsed += 2) {
    if (entity?.isValid === false) return true;
    await bot.waitForTicks?.(2);
  }
  return entity?.isValid === false;
}

async function shootEntity(bot, entity, options = {}) {
  if (!hasAnyItem(bot, REQUIRED_ITEMS.arrows)) {
    return { success: false, code: 'DRAGON_ARROWS_UNAVAILABLE', data: {} };
  }
  if (!await equipNamed(bot, REQUIRED_ITEMS.bow)) {
    return { success: false, code: 'DRAGON_BOW_UNAVAILABLE', data: {} };
  }

  try {
    const aim = entity.position.offset?.(0, entity.height ? entity.height / 2 : 0, 0)
      || entity.position;
    await bot.lookAt(aim, true);
    bot.activateItem();
    await bot.waitForTicks?.(options.chargeTicks || DRAGON_CONFIG.bowChargeTicks);
    bot.deactivateItem();
    return { success: true, code: 'PROJECTILE_FIRED', data: { target: entity.name } };
  } catch (error) {
    bot.deactivateItem?.();
    return {
      success: false,
      code: 'DRAGON_RANGED_ATTACK_FAILED',
      data: { error: error.message }
    };
  }
}

async function destroyCrystal(bot, crystal, options = {}) {
  const cageBlocks = findCageBlocks(bot, crystal);
  const caged = cageBlocks.length > 0;
  const distance = distanceBetween(bot.entity?.position, crystal.position);
  console.log('[dragon:crystal]', { position: crystal.position, caged, distance });

  if (caged) {
    const cageBlock = cageBlocks[0];
    try {
      await bot.pathfinder.goto(new GoalNear(
        Math.floor(cageBlock.position.x),
        Math.floor(cageBlock.position.y),
        Math.floor(cageBlock.position.z),
        4
      ));
      if (!await equipTool(bot, 'pickaxe')) {
        return {
          success: false,
          code: 'CAGED_CRYSTAL_PICKAXE_UNAVAILABLE',
          data: { position: crystal.position }
        };
      }
      await bot.dig(cageBlock);
      console.log('[dragon:cage-opened]', { position: cageBlock.position });
    } catch (error) {
      return {
        success: false,
        code: 'CAGED_CRYSTAL_UNREACHABLE',
        data: { position: crystal.position, error: error.message }
      };
    }
  }

  const positionResult = await prepareCrystalShotPosition(
  bot,
  crystal,
  options
  );

  if (!positionResult.success) {
    return {
      success: false,
      code: positionResult.code,
      data: {
        ...positionResult.data,
        crystalPosition: crystal.position
      }
    };
  }

  const fired = await shootEntity(
    bot,
    crystal,
    options
  );

  if (!fired.success) {
    return fired;
  }

  const destroyed = await waitForInvalid(bot, crystal, options.waitTicks || 60);
  return {
    success: destroyed,
    code: destroyed
      ? 'END_CRYSTAL_DESTROYED'
      : 'END_CRYSTAL_STILL_ACTIVE',
    data: {
      caged,
      position: crystal.position,
      shotPosition: coordinates(bot.entity),
      pillarBlocksPlaced: positionResult.data.placed
    }
  };
}

function findBreathCloud(bot, range = DRAGON_CONFIG.breathAvoidRange) {
  return validEntities(bot, entity =>
    entity.name === 'area_effect_cloud' &&
    distanceBetween(bot.entity?.position, entity.position) <= range
  )[0] || null;
}

async function avoidDragonBreath(bot) {
  const cloud = findBreathCloud(bot);
  if (!cloud) return true;
  console.warn('[dragon:breath]', { position: cloud.position });
  return retreatFromEntity(bot, cloud, 10);
}

function isDragonPerched(dragon) {
  const velocity = dragon?.velocity;
  const speed = velocity ? Math.hypot(velocity.x || 0, velocity.y || 0, velocity.z || 0) : 0;
  return dragon?.position?.y <= DRAGON_CONFIG.perchHeight && speed < 0.35;
}

function coordinates(entity) {
  return entity?.position ? {
    x: Math.floor(entity.position.x),
    y: Math.floor(entity.position.y),
    z: Math.floor(entity.position.z)
  } : null;
}

async function requestDragonHelp(bot, username, reason, entity) {
  const location = coordinates(entity) || coordinates(bot.entity);
  bot.chat(`${location.x} ${location.y} ${location.z}에서 드래곤 공략을 계속할 수 없어. 도와줘!`);
  const player = bot.players?.[username]?.entity;
  if (player) {
    bot.pathfinder?.setGoal(new GoalFollow(player, 3), true);
    bot._dragonRetreatActive = true;
  }
  return {
    success: false,
    code: 'DRAGON_HELP_REQUESTED',
    data: { reason, coordinates: location }
  };
}

async function fightEnderDragon(bot, username, options = {}) {
  const config = { ...DRAGON_CONFIG, ...options };
  const startedAt = Date.now();
  let crystalsDestroyed = 0;
  let dragonAttacks = 0;
  let dragonSeen = false;
  bot.isStopped = false;
  bot.isCombatActive = true;
  bot._dragonRetreatActive = false;

  try {
    const state = readiness(bot);
    console.log('[dragon:start]', state);
    if (!state.sword || !state.bow || !state.arrows || !state.food ||
        state.health < config.minStartHealth) {
      return requestDragonHelp(bot, username, 'NOT_READY', bot.entity);
    }

    while (!bot.isStopped && Date.now() - startedAt < config.maxFightMs) {
      if ((bot.health ?? 20) < config.minFightHealth) {
        if ((bot.food ?? 20) < 20) await eatFood(bot);
        if ((bot.health ?? 20) < config.minFightHealth) {
          return requestDragonHelp(bot, username, 'LOW_HEALTH', findDragon(bot));
        }
      }

      if (!await avoidDragonBreath(bot)) {
        return requestDragonHelp(bot, username, 'BREATH_ESCAPE_FAILED', findDragon(bot));
      }

      const crystals = findEndCrystals(bot, config.crystalSearchRange);
      if (crystals.length > 0) {
        const result = await destroyCrystal(bot, crystals[0], options);
        if (result.success) crystalsDestroyed += 1;
        else if (result.code === 'CAGED_CRYSTAL_UNREACHABLE') {
          return requestDragonHelp(bot, username, result.code, crystals[0]);
        }
        await bot.waitForTicks?.(config.scanTicks);
        continue;
      }

      const dragon = findDragon(bot);
      if (!dragon) {
        if (!dragonSeen) {
          return requestDragonHelp(bot, username, 'DRAGON_NOT_VISIBLE', bot.entity);
        }
        return {
          success: true,
          code: 'ENDER_DRAGON_DEFEATED',
          data: { crystalsDestroyed, dragonAttacks }
        };
      }
      dragonSeen = true;

      if (isDragonPerched(dragon)) {
        await equipTool(bot, 'sword');
        const result = await performBoundedAttack(bot, dragon, {
          attackRange: config.meleeRange,
          maxChaseDistance: 32,
          maxChaseMs: 15000,
          minHealth: config.minFightHealth,
          ignoreStopped: true
        });
        dragonAttacks += result.data?.attacks || 0;
      } else {
        const result = await shootEntity(bot, dragon, options);
        if (result.success) dragonAttacks += 1;
      }
      await bot.waitForTicks?.(config.scanTicks);
    }

    return {
      success: false,
      code: bot.isStopped ? 'DRAGON_FIGHT_STOPPED' : 'DRAGON_FIGHT_TIMEOUT',
      data: { crystalsDestroyed, dragonAttacks }
    };
  } finally {
    bot.deactivateItem?.();
    bot.setControlState?.('jump', false);

    if (!bot._dragonRetreatActive) {
      bot.pathfinder?.setGoal(null);
    }

    bot.isCombatActive = false;
  }
}

module.exports = {
  findDragon,
  findEndCrystals,
  findCageBlocks,
  isCagedCrystal,
  readiness,
  shootEntity,

  calculateCrystalApproachPosition,
  pillarUp,
  prepareCrystalShotPosition,

  destroyCrystal,
  findBreathCloud,
  avoidDragonBreath,
  isDragonPerched,
  fightEnderDragon
};
