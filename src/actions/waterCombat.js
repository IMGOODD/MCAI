const { goals: { GoalFollow } } = require('mineflayer-pathfinder');
const { ensureSafety } = require('./ensureSafety');
const { distanceBetween } = require('./combat');

const WATER_BLOCKS = new Set(['water', 'flowing_water', 'bubble_column']);

function offset(position, x, y, z) {
  if (typeof position?.offset === 'function') return position.offset(x, y, z);
  return {
    x: Math.floor(position?.x || 0) + x,
    y: Math.floor(position?.y || 0) + y,
    z: Math.floor(position?.z || 0) + z
  };
}

function floorPosition(position) {
  if (typeof position?.floored === 'function') return position.floored();
  return {
    x: Math.floor(position?.x || 0),
    y: Math.floor(position?.y || 0),
    z: Math.floor(position?.z || 0)
  };
}

function isWaterBlock(block) {
  if (WATER_BLOCKS.has(block?.name)) return true;
  try {
    const properties = typeof block?.getProperties === 'function'
      ? block.getProperties()
      : block?.properties;
    return properties?.waterlogged === true;
  } catch {
    return block?.properties?.waterlogged === true;
  }
}

function getWaterDepth(bot, position, maxScan = 6) {
  if (!position || typeof bot.blockAt !== 'function') return 0;
  let cursor = floorPosition(position);
  if (!isWaterBlock(bot.blockAt(cursor))) cursor = offset(cursor, 0, -1, 0);
  if (!isWaterBlock(bot.blockAt(cursor))) return 0;

  let depth = 0;
  while (depth < maxScan && isWaterBlock(bot.blockAt(cursor))) {
    depth += 1;
    cursor = offset(cursor, 0, -1, 0);
  }
  return isWaterBlock(bot.blockAt(cursor)) ? maxScan + 1 : depth;
}

function setWaterTraversal(bot, enabled) {
  const movements = bot.pathfinder?.movements;
  if (!movements) return () => {};

  const previousLiquidCost = movements.liquidCost;
  const removedWaterIds = [];
  if (enabled) {
    movements.liquidCost = 1;
    for (const blockName of WATER_BLOCKS) {
      const blockId = bot.registry?.blocksByName?.[blockName]?.id;
      if (blockId != null && movements.blocksToAvoid?.has(blockId)) {
        movements.blocksToAvoid.delete(blockId);
        removedWaterIds.push(blockId);
      }
    }
  }

  return () => {
    movements.liquidCost = previousLiquidCost;
    for (const blockId of removedWaterIds) movements.blocksToAvoid?.add(blockId);
  };
}

async function recoverFromUnsafeWater(bot, recoverFromWater, reason, data) {
  if (!bot.entity?.isInWater) {
    return { success: false, code: reason, data: { ...data, recovered: false } };
  }
  const recovered = await recoverFromWater(bot, 'water_combat');
  return {
    success: false,
    code: recovered && !bot.entity?.isInWater ? 'WATER_COMBAT_RECOVERED' : 'WATER_COMBAT_RECOVERY_FAILED',
    data: { ...data, recovered: Boolean(recovered && !bot.entity?.isInWater), reason }
  };
}

async function performWaterCombat(bot, target, options = {}) {
  const attackRange = options.attackRange || 3;
  const maxChaseDistance = options.maxChaseDistance || 24;
  const maxChaseMs = options.maxChaseMs || 15000;
  const maxWaterDepth = options.maxWaterDepth || 3;
  const minHealth = options.minHealth || 8;
  const minOxygen = options.minOxygen || 8;
  const recoverFromWater = options.recoverFromWater || ensureSafety;
  const sourceOrigin = options.origin || bot.entity?.position;
  const origin = sourceOrigin
    ? { x: sourceOrigin.x, y: sourceOrigin.y, z: sourceOrigin.z }
    : null;
  const startedAt = Date.now();
  const restoreMovements = setWaterTraversal(bot, true);
  const wasCombatActive = Boolean(bot.isCombatActive);
  let attacks = 0;
  let chaseTicks = 0;

  bot.isCombatActive = true;
  console.log('[waterCombat:start]', {
    target: target?.name,
    targetDepth: getWaterDepth(bot, target?.position, maxWaterDepth + 1),
    botDepth: getWaterDepth(bot, bot.entity?.position, maxWaterDepth + 1),
    oxygen: bot.oxygenLevel,
    health: bot.health
  });

  try {
    while (target?.isValid !== false) {
      if (!options.ignoreStopped && bot.isStopped) {
        return { success: false, code: 'COMBAT_STOPPED', data: { attacks } };
      }
      if ((bot.health ?? 20) < minHealth) {
        return recoverFromUnsafeWater(
          bot,
          recoverFromWater,
          'WATER_COMBAT_LOW_HEALTH',
          { attacks, health: bot.health }
        );
      }
      if ((bot.oxygenLevel ?? 20) <= minOxygen) {
        return recoverFromUnsafeWater(
          bot,
          recoverFromWater,
          'WATER_COMBAT_LOW_OXYGEN',
          { attacks, oxygen: bot.oxygenLevel }
        );
      }

      const targetDepth = getWaterDepth(bot, target.position, maxWaterDepth + 1);
      const botDepth = getWaterDepth(bot, bot.entity?.position, maxWaterDepth + 1);
      if (targetDepth > maxWaterDepth || (bot.entity?.isInWater && botDepth > maxWaterDepth)) {
        return recoverFromUnsafeWater(
          bot,
          recoverFromWater,
          'WATER_COMBAT_UNSAFE_DEPTH',
          { attacks, targetDepth, botDepth, maxWaterDepth }
        );
      }

      if (
        Date.now() - startedAt > maxChaseMs ||
        distanceBetween(origin, target.position) > maxChaseDistance
      ) {
        return {
          success: false,
          code: 'WATER_COMBAT_LEASH_EXCEEDED',
          data: { attacks, chaseTicks }
        };
      }

      const distance = distanceBetween(bot.entity?.position, target.position);
      if (distance > attackRange) {
        bot.pathfinder?.setGoal(new GoalFollow(target, attackRange), true);
        bot.setControlState?.('jump', Boolean(bot.entity?.isInWater));
        await bot.waitForTicks?.(2);
        chaseTicks += 2;
        continue;
      }

      bot.pathfinder?.setGoal(null);
      bot.setControlState?.('jump', Boolean(bot.entity?.isInWater));
      await bot.lookAt(target.position.offset?.(0, target.height || 1, 0) || target.position);
      await bot.attack(target);
      attacks += 1;
      await bot.waitForTicks?.(10);
    }

    return {
      success: true,
      code: 'TARGET_DEFEATED',
      data: { attacks, chaseTicks, mode: 'water' }
    };
  } catch (error) {
    console.error('[waterCombat] failed:', error.message);
    return {
      success: false,
      code: 'WATER_COMBAT_FAILED',
      data: { attacks, chaseTicks, error: error.message }
    };
  } finally {
    bot.pathfinder?.setGoal(null);
    bot.setControlState?.('jump', false);
    restoreMovements();
    bot.isCombatActive = wasCombatActive;
  }
}

module.exports = {
  isWaterBlock,
  getWaterDepth,
  performWaterCombat
};
