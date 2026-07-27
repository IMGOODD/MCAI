const combatData = require('../data/combatData');
const { equipTool } = require('../utils/inventory');
const { eatFood } = require('../actions/eatFood');
const {
  distanceBetween,
  isEntityInWater,
  performBoundedAttack,
  retreatFromEntity
} = require('../actions/combat');
const { performWaterCombat } = require('../actions/waterCombat');
const { goals: { GoalFollow } } = require('mineflayer-pathfinder');

function isNamed(entity) {
  return Boolean(entity?.customName || entity?.nametag);
}

function isHostileEntity(entity) {
  if (!entity || entity.isValid === false || isNamed(entity)) return false;
  if (combatData.EXCLUDED_NEUTRAL_MOBS.has(entity.name)) return false;
  return combatData.HOSTILE_MOBS.has(entity.name);
}

function findHostileThreats(bot, range = combatData.defense.detectionRange, options = {}) {
  const origin = options.origin || bot.entity?.position;
  const allowedNames = options.names ? new Set(options.names) : null;
  return Object.values(bot.entities || {})
    .filter(isHostileEntity)
    .filter(entity => !allowedNames || allowedNames.has(entity.name))
    .filter(entity => distanceBetween(origin, entity.position) <= range)
    .sort((left, right) =>
      distanceBetween(bot.entity?.position, left.position) -
      distanceBetween(bot.entity?.position, right.position)
    );
}

function findZombieThreats(bot, range = combatData.zombie.detectionRange) {
  return findHostileThreats(bot, range, { names: ['zombie'] });
}

function hasSword(bot) {
  return Boolean(bot.inventory?.items?.().some(item => item.name.endsWith('_sword')));
}

function decideHostileResponse(bot, threats, config = combatData.defense) {
  if (!threats.length) return { type: 'ignore', reason: 'NO_THREAT' };
  if ((bot.health ?? 20) < config.minFightHealth) {
    return { type: 'retreat', reason: 'LOW_HEALTH', target: threats[0] };
  }
  if (!hasSword(bot)) {
    return { type: 'retreat', reason: 'NO_SWORD', target: threats[0] };
  }
  if (threats.length > config.maxSimultaneousThreats) {
    return { type: 'retreat', reason: 'MULTIPLE_THREATS', target: threats[0] };
  }
  const unsupported = threats.find(entity => combatData.UNSAFE_MELEE_MOBS.has(entity.name));
  if (unsupported) {
    return { type: 'retreat', reason: 'UNSAFE_MELEE_TARGET', target: unsupported };
  }
  return { type: 'fight', reason: 'SAFE_TO_ENGAGE', target: threats[0] };
}

function decideZombieResponse(bot, threats, config = combatData.zombie) {
  return decideHostileResponse(bot, threats, config);
}

async function eatAfterDamage(bot, previousHealth) {
  if ((bot.health ?? previousHealth) >= previousHealth) return false;
  console.log('[defense:damaged]', {
    before: previousHealth,
    after: bot.health,
    food: bot.food
  });
  return eatFood(bot);
}

function threatCoordinates(entity) {
  if (!entity?.position) return null;
  return {
    x: Math.floor(entity.position.x),
    y: Math.floor(entity.position.y),
    z: Math.floor(entity.position.z)
  };
}

async function fleeToCommander(bot, username, options = {}) {
  const player = bot.players?.[username]?.entity;
  if (!player || !bot.pathfinder) return false;
  const range = options.commanderRange || 3;
  const timeoutTicks = options.commanderTimeoutTicks || 300;
  bot.pathfinder.setGoal(new GoalFollow(player, range), true);
  try {
    for (let ticks = 0; ticks < timeoutTicks; ticks += 2) {
      if (bot.isStopped) return false;
      if (distanceBetween(bot.entity?.position, player.position) <= range + 0.5) {
        return true;
      }
      await bot.waitForTicks?.(2);
    }
    return false;
  } finally {
    bot.pathfinder.setGoal(null);
  }
}

async function escapeHostileThreat(bot, decision, config, options = {}) {
  const username = options.username || bot.lastCommanderUsername;
  const coordinates = threatCoordinates(decision.target);
  if (username && bot.players?.[username]?.entity) {
    const displayName =
      combatData.DISPLAY_NAMES[decision.target?.name] ||
      decision.target?.name ||
      '몬스터';
    if (coordinates) {
      bot.chat(
        `${coordinates.x} ${coordinates.y} ${coordinates.z}에 ${displayName}이(가) 있어. ` +
        '지금은 못 잡겠어. 네 쪽으로 갈게!'
      );
    }
    const escaped = await fleeToCommander(bot, username, options);
    return {
      escaped,
      code: escaped ? 'DEFENSE_FLED_TO_COMMANDER' : 'DEFENSE_COMMANDER_UNREACHABLE',
      username,
      coordinates
    };
  }

  const escaped = await retreatFromEntity(bot, decision.target, config.retreatDistance);
  return {
    escaped,
    code: escaped ? 'DEFENSE_RETREATED' : 'DEFENSE_RETREAT_FAILED',
    username: null,
    coordinates
  };
}

async function handleHostileThreat(bot, options = {}) {
  if (bot.isCombatActive || bot.isSafetyActive) {
    return { success: false, code: 'DEFENSE_BUSY', data: {} };
  }

  const config = { ...combatData.defense, ...options };
  const threats = findHostileThreats(bot, config.detectionRange, {
    origin: options.origin,
    names: options.names
  });
  const decision = decideHostileResponse(bot, threats, config);
  if (decision.type === 'ignore') {
    return { success: true, code: 'NO_HOSTILE_THREAT', data: {} };
  }

  bot.isCombatActive = true;
  const previousHealth = bot.health ?? 20;
  bot.pathfinder?.setGoal(null);
  try {
    try {
      await Promise.resolve(bot.stopDigging?.());
    } catch (error) {
      console.warn('[defense] stopDigging failed:', error.message);
    }

    console.warn('[defense:decision]', {
      response: decision.type,
      reason: decision.reason,
      target: decision.target?.name,
      threats: threats.length,
      health: bot.health
    });

    if (decision.type === 'retreat') {
      const escape = await escapeHostileThreat(bot, decision, config, options);
      return {
        success: escape.escaped,
        code: escape.code,
        data: {
          reason: decision.reason,
          target: decision.target?.name,
          threats: threats.length,
          username: escape.username,
          coordinates: escape.coordinates
        }
      };
    }

    const equipped = await equipTool(bot, 'sword');
    if (!equipped) {
      const escape = await escapeHostileThreat(
        bot,
        { ...decision, type: 'retreat', reason: 'NO_SWORD' },
        config,
        options
      );
      return {
        success: escape.escaped,
        code: escape.code,
        data: {
          reason: 'NO_SWORD',
          target: decision.target?.name,
          username: escape.username,
          coordinates: escape.coordinates
        }
      };
    }

    const waterCombat = Boolean(
      bot.entity?.isInWater || isEntityInWater(bot, decision.target)
    );
    const attack = waterCombat ? performWaterCombat : performBoundedAttack;
    const combatResult = await attack(bot, decision.target, {
      attackRange: config.attackRange,
      maxChaseDistance: config.maxChaseDistance,
      maxChaseMs: config.maxChaseMs,
      minHealth: config.minFightHealth,
      minOxygen: options.minOxygen || 8,
      maxWaterDepth: options.maxWaterDepth || 3,
      origin: options.origin,
      ignoreStopped: false
    });
    await eatAfterDamage(bot, previousHealth);
    if (!combatResult.success && combatResult.code !== 'COMBAT_STOPPED') {
      const escape = await escapeHostileThreat(
        bot,
        { ...decision, type: 'retreat', reason: combatResult.code },
        config,
        options
      );
      return {
        success: escape.escaped,
        code: escape.code,
        data: {
          reason: combatResult.code,
          target: decision.target.name,
          username: escape.username,
          coordinates: escape.coordinates,
          ...combatResult.data
        }
      };
    }
    return {
      success: combatResult.success,
      code: combatResult.success ? 'HOSTILE_DEFENDED' : combatResult.code,
      data: {
        target: decision.target.name,
        mode: waterCombat ? 'water' : 'land',
        ...combatResult.data
      }
    };
  } finally {
    bot.pathfinder?.setGoal(null);
    bot.isCombatActive = false;
  }
}

async function handleZombieThreat(bot, options = {}) {
  return handleHostileThreat(bot, {
    ...combatData.zombie,
    ...options,
    names: ['zombie']
  });
}

async function waitUntilCombatComplete(bot) {
  while (bot.isCombatActive) {
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(1);
    else await new Promise(resolve => setTimeout(resolve, 50));
  }
}

module.exports = {
  isHostileEntity,
  findHostileThreats,
  findZombieThreats,
  hasSword,
  decideHostileResponse,
  decideZombieResponse,
  eatAfterDamage,
  escapeHostileThreat,
  fleeToCommander,
  handleHostileThreat,
  handleZombieThreat,
  threatCoordinates,
  waitUntilCombatComplete
};
