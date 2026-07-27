const { goals: { GoalNear } } = require('mineflayer-pathfinder');

const WATER_BLOCKS = new Set(['water', 'flowing_water', 'bubble_column']);

function isWater(block) {
  return WATER_BLOCKS.has(block?.name);
}

function isDrySafeGround(bot, ground) {
  if (!ground?.position || ground.boundingBox !== 'block') return false;
  const pos = ground.position;
  const feet = bot.blockAt(pos.offset(0, 1, 0));
  const head = bot.blockAt(pos.offset(0, 2, 0));
  if (!feet || !head || feet.boundingBox !== 'empty' || head.boundingBox !== 'empty') return false;

  const checks = [
    [0, 1, 0], [0, 2, 0],
    [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]
  ];
  return checks.every(([x, y, z]) => !isWater(bot.blockAt(pos.offset(x, y, z))));
}

function findSafeGround(bot, maxDistance = 16) {
  if (typeof bot.findBlocks !== 'function') return null;
  const positions = bot.findBlocks({
    matching: block => isDrySafeGround(bot, block),
    maxDistance,
    // Inspect enough candidates to find dry ground near deep water.
    count: 512
  });
  return positions.map(position => bot.blockAt(position)).find(Boolean) || null;
}

function findSafeGroundByScan(bot, horizontalRadius = 24, verticalUp = 24, verticalDown = 6) {
  if (typeof bot.blockAt !== 'function' || !bot.entity?.position) return null;

  const entityPosition = bot.entity.position;
  const origin = typeof entityPosition.floored === 'function'
    ? entityPosition.floored()
    : entityPosition;
  const verticalOffsets = [-1];
  for (let y = 0; y <= verticalUp; y++) verticalOffsets.push(y);
  for (let y = 2; y <= verticalDown; y++) verticalOffsets.push(-y);

  for (let radius = 0; radius <= horizontalRadius; radius++) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (radius > 0 && Math.abs(x) !== radius && Math.abs(z) !== radius) continue;

        for (const y of verticalOffsets) {
          const position = typeof origin.offset === 'function'
            ? origin.offset(x, y, z)
            : {
                x: Math.floor(origin.x) + x,
                y: Math.floor(origin.y) + y,
                z: Math.floor(origin.z) + z
              };
          const ground = bot.blockAt(position);
          if (isDrySafeGround(bot, ground)) return ground;
        }
      }
    }
  }
  return null;
}

async function ensureSafety(bot, reason = 'damage') {
  if (bot.isSafetyActive) return false;
  bot.isSafetyActive = true;
  const wasStopped = Boolean(bot.isStopped);
  bot.isStopped = true;
  const movements = bot.pathfinder?.movements;
  const previousLiquidCost = movements?.liquidCost;
  const temporarilyAllowedWaterIds = [];

  try {
    bot.pathfinder?.setGoal(null);
    try { bot.stopDigging?.(); } catch (error) {
      console.warn('[safety] stopDigging failed:', error.message);
    }
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(2);

    const safeGround = [16, 32, 64]
      .map(distance => findSafeGround(bot, distance))
      .find(Boolean)
      || findSafeGroundByScan(bot);
    if (!safeGround) {
      console.error('[safety] safe ground not found', { reason, position: bot.entity?.position });
      return false;
    }

    console.warn('[safety] moving to safe ground', {
      reason,
      health: bot.health,
      oxygen: bot.oxygenLevel,
      from: bot.entity?.position,
      to: safeGround.position
    });

    // Permit water traversal only while escaping from water.
    if (movements) {
      movements.liquidCost = 1;
      for (const blockName of WATER_BLOCKS) {
        const blockId = bot.registry?.blocksByName?.[blockName]?.id;
        if (blockId != null && movements.blocksToAvoid?.has(blockId)) {
          movements.blocksToAvoid.delete(blockId);
          temporarilyAllowedWaterIds.push(blockId);
        }
      }
    }
    await bot.pathfinder.goto(new GoalNear(
      safeGround.position.x,
      safeGround.position.y + 1,
      safeGround.position.z,
      0
    ));
    const escapedWater = !bot.entity?.isInWater;
    if (!escapedWater) {
      console.error('[safety] reached candidate but still in water', {
        reason,
        position: bot.entity?.position,
        target: safeGround.position
      });
    }
    return escapedWater;
  } catch (error) {
    console.error('[safety] escape failed:', error.message);
    return false;
  } finally {
    bot.pathfinder?.setGoal(null);
    if (movements) {
      movements.liquidCost = previousLiquidCost;
      for (const blockId of temporarilyAllowedWaterIds) movements.blocksToAvoid?.add(blockId);
    }
    bot.isStopped = wasStopped;
    bot.isSafetyActive = false;
  }
}

async function waitUntilSafe(bot) {
  while (bot.isSafetyActive) {
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(1);
    else await new Promise(resolve => setTimeout(resolve, 50));
  }
}

module.exports = {
  ensureSafety,
  waitUntilSafe,
  isDrySafeGround,
  findSafeGround,
  findSafeGroundByScan
};
