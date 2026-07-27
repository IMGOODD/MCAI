const { goals: { GoalFollow, GoalNear } } = require('mineflayer-pathfinder');
const { ensureSafety } = require('./ensureSafety');

const WATER_BLOCKS = new Set(['water', 'flowing_water', 'bubble_column']);

function distanceBetween(left, right) {
  if (!left || !right) return Infinity;
  if (typeof left.distanceTo === 'function') return left.distanceTo(right);
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function isEntityInWater(bot, entity) {
  if (!entity?.position || typeof bot.blockAt !== 'function') return false;
  const position = typeof entity.position.floored === 'function'
    ? entity.position.floored()
    : {
        x: Math.floor(entity.position.x),
        y: Math.floor(entity.position.y),
        z: Math.floor(entity.position.z)
      };
  const below = typeof position.offset === 'function'
    ? position.offset(0, -1, 0)
    : { x: position.x, y: position.y - 1, z: position.z };

  return [position, below].some(blockPosition => {
    const block = bot.blockAt(blockPosition);
    if (WATER_BLOCKS.has(block?.name)) return true;
    try {
      const properties = typeof block?.getProperties === 'function'
        ? block.getProperties()
        : block?.properties;
      return properties?.waterlogged === true;
    } catch {
      return block?.properties?.waterlogged === true;
    }
  });
}

async function performBoundedAttack(bot, target, options = {}) {
  const attackRange = options.attackRange || 3;
  const maxChaseDistance = options.maxChaseDistance || 16;
  const maxChaseMs = options.maxChaseMs || 8000;
  const minHealth = options.minHealth || 6;
  const maxWaterRecoveries = options.maxWaterRecoveries || 3;
  const recoverFromWater = options.recoverFromWater || ensureSafety;
  const sourceOrigin = options.origin || bot.entity?.position;
  const origin = sourceOrigin
    ? { x: sourceOrigin.x, y: sourceOrigin.y, z: sourceOrigin.z }
    : null;
  const startedAt = Date.now();
  let attacks = 0;
  let waterRecoveries = 0;

  try {
    while (target?.isValid !== false) {
      if (!options.ignoreStopped && bot.isStopped) {
        return { success: false, code: 'COMBAT_STOPPED', data: { attacks } };
      }
      if ((bot.health ?? 20) < minHealth) {
        return { success: false, code: 'COMBAT_LOW_HEALTH', data: { attacks } };
      }
      if (bot.entity?.isInWater) {
        if (waterRecoveries >= maxWaterRecoveries) {
          return {
            success: false,
            code: 'COMBAT_WATER_RECOVERY_FAILED',
            data: { attacks, waterRecoveries }
          };
        }

        waterRecoveries += 1;
        console.warn('[combat:water-recovery]', {
          attempt: waterRecoveries,
          maxWaterRecoveries,
          position: bot.entity?.position
        });
        const recovered = await recoverFromWater(bot, 'combat_water');
        console.log('[combat:water-recovery-result]', {
          recovered,
          attempt: waterRecoveries,
          position: bot.entity?.position
        });
        if (!recovered || bot.entity?.isInWater) {
          return {
            success: false,
            code: 'COMBAT_WATER_RECOVERY_FAILED',
            data: { attacks, waterRecoveries }
          };
        }
        continue;
      }
      if (isEntityInWater(bot, target)) {
        return {
          success: false,
          code: 'COMBAT_TARGET_IN_WATER',
          data: { attacks, waterRecoveries }
        };
      }
      if (Date.now() - startedAt > maxChaseMs ||
          distanceBetween(origin, target.position) > maxChaseDistance) {
        return { success: false, code: 'COMBAT_LEASH_EXCEEDED', data: { attacks } };
      }

      const distance = distanceBetween(bot.entity?.position, target.position);
      if (distance > attackRange) {
        try {
          bot.pathfinder.setGoal(new GoalFollow(target, attackRange), true);
          while (target?.isValid !== false &&
                 distanceBetween(bot.entity?.position, target.position) > attackRange + 0.5) {
            if ((!options.ignoreStopped && bot.isStopped) ||
                (bot.health ?? 20) < minHealth ||
                bot.entity?.isInWater ||
                isEntityInWater(bot, target) ||
                Date.now() - startedAt > maxChaseMs ||
                distanceBetween(origin, target.position) > maxChaseDistance) {
              break;
            }
            await bot.waitForTicks(2);
          }
        } catch (error) {
          console.warn('[combat] chase failed:', error.message);
        } finally {
          bot.pathfinder.setGoal(null);
        }
        if (target?.isValid === false) break;
        if (distanceBetween(bot.entity?.position, target.position) > attackRange + 1) {
          continue;
        }
      }

      await bot.lookAt(target.position.offset?.(0, target.height || 1, 0) || target.position);
      await bot.attack(target);
      attacks += 1;
      await bot.waitForTicks(10);
    }
    return {
      success: true,
      code: 'TARGET_DEFEATED',
      data: { attacks, waterRecoveries }
    };
  } catch (error) {
    console.error('[combat] attack failed:', error.message);
    return {
      success: false,
      code: 'COMBAT_FAILED',
      data: { attacks, waterRecoveries, error: error.message }
    };
  } finally {
    bot.pathfinder?.setGoal(null);
  }
}

async function retreatFromEntity(bot, target, distance = 8) {
  const botPosition = bot.entity?.position;
  const targetPosition = target?.position;
  if (!botPosition || !targetPosition) return false;
  const dx = botPosition.x - targetPosition.x;
  const dz = botPosition.z - targetPosition.z;
  const length = Math.hypot(dx, dz) || 1;
  const x = Math.floor(botPosition.x + (dx / length) * distance);
  const z = Math.floor(botPosition.z + (dz / length) * distance);

  try {
    await bot.pathfinder.goto(new GoalNear(x, Math.floor(botPosition.y), z, 2));
    return true;
  } catch (error) {
    console.warn('[combat] retreat failed:', error.message);
    return false;
  } finally {
    bot.pathfinder?.setGoal(null);
  }
}

module.exports = {
  distanceBetween,
  isEntityInWater,
  performBoundedAttack,
  retreatFromEntity
};
