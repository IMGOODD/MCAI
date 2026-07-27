const { getHuntingResource, normalizeHuntTarget } = require('../data/huntingData');
const { equipTool, getItemCount } = require('../utils/inventory');
const { collectMatchingItems } = require('./itemSearch');
const { distanceBetween, isEntityInWater, performBoundedAttack } = require('./combat');
const { performWaterCombat } = require('./waterCombat');
const { ensureSafety } = require('./ensureSafety');

const MIN_ADULT_HEIGHT = { cow: 1.2, pig: 0.7, chicken: 0.5 };

function isNamed(entity) {
  return Boolean(entity?.customName || entity?.nametag);
}

function isAdultAnimal(entity) {
  if (!entity || entity.isBaby === true) return false;
  const minimumHeight = MIN_ADULT_HEIGHT[entity.name];
  return minimumHeight == null || entity.height == null || entity.height >= minimumHeight;
}

function isEligibleAnimal(bot, entity, resource, options = {}) {
  if (!entity || entity.isValid === false || !resource?.mobs.includes(entity.name)) return false;
  if (!isAdultAnimal(entity) || isNamed(entity)) return false;
  if (entity.isTamed === true || entity.ownerUuid || entity.ownerUUID) return false;
  if (isEntityInWater(bot, entity) && options.allowWaterCombat !== true) return false;
  return distanceBetween(bot.entity?.position, entity.position) <= (options.searchRadius || 64);
}

function findHuntTarget(bot, resource, excludedIds = new Set(), options = {}) {
  const entities = Object.values(bot.entities || {})
    .filter(entity => !excludedIds.has(entity.id))
    .filter(entity => isEligibleAnimal(bot, entity, resource, options))
    .sort((left, right) =>
      distanceBetween(bot.entity?.position, left.position) -
      distanceBetween(bot.entity?.position, right.position)
    );
  if (entities.length > 0) return entities[0];
  if (typeof bot.nearestEntity !== 'function') return null;
  return bot.nearestEntity(entity =>
    !excludedIds.has(entity.id) && isEligibleAnimal(bot, entity, resource, options)
  );
}

async function huntResource(bot, target, requested = 1, options = {}) {
  const normalizedTarget = normalizeHuntTarget(target);
  const resource = getHuntingResource(normalizedTarget);
  if (!resource) {
    return { success: false, code: 'UNSUPPORTED_HUNT_RESOURCE', data: { resource: target } };
  }

  const requestedCount = Math.max(1, requested);
  const countMode = ['kills', 'until_empty'].includes(options.countMode)
    ? options.countMode
    : 'drops';
  const untilEmpty = countMode === 'until_empty';
  const matcher = name => resource.drops.includes(name);
  const beforeCount = getItemCount(bot, matcher);
  const excludedIds = new Set();
  const maxSearchAttempts = options.maxSearchAttempts ||
    options.maxAttempts ||
    (untilEmpty ? 256 : requestedCount * 3 + 3);
  const maxTargetRetries = options.maxTargetRetries || 5;
  let searchAttempts = 0;
  let combatRetries = 0;
  let hunted = 0;
  let areaCleared = false;
  let executionFailureCode = null;
  let lockedTarget = null;
  let targetRetries = 0;
  const retryExhaustedIds = new Set();
  const equipWeapon = options.equipWeapon || equipTool;
  const attackTarget = options.attackTarget || performBoundedAttack;
  const waterAttackTarget = options.waterAttackTarget || options.attackTarget || performWaterCombat;
  const collectDrops = options.collectDrops || collectMatchingItems;
  const recoverFromWater = options.recoverFromWater || ensureSafety;
  const targetSearchOptions = {
    ...options,
    allowWaterCombat: options.allowWaterCombat !== false
  };

  const acquiredCount = () => getItemCount(bot, matcher) - beforeCount;
  const progressCount = () => countMode === 'drops' ? acquiredCount() : hunted;

  console.log('[hunt:start]', {
    resource: normalizedTarget,
    requested: requestedCount,
    countMode,
    mobs: resource.mobs,
    beforeCount
  });

  while (untilEmpty || progressCount() < requestedCount) {
    if (bot.isStopped) {
      executionFailureCode = 'HUNT_STOPPED';
      break;
    }
    if ((bot.health ?? 20) < (options.minHealth || 8)) {
      console.warn('[hunt] stopped because health is low', { health: bot.health });
      executionFailureCode = 'HUNT_LOW_HEALTH';
      break;
    }

    let animal = (
      lockedTarget &&
      lockedTarget.isValid !== false
    )
      ? lockedTarget
      : null;

    if (!animal) {
      if (searchAttempts >= maxSearchAttempts) {
        executionFailureCode = 'HUNT_ATTEMPTS_EXHAUSTED';
        console.warn('[hunt:search-limit]', {
          searchAttempts,
          maxSearchAttempts,
          hunted,
          combatRetries
        });
        break;
      }
      searchAttempts += 1;
      animal = findHuntTarget(bot, resource, excludedIds, targetSearchOptions);
    }

    console.log('[hunt:target]', {
      searchAttempt: searchAttempts,
      targetRetry: targetRetries,
      found: Boolean(animal),
      mob: animal?.name,
      position: animal?.position
    });
    if (!animal) {
      if (retryExhaustedIds.size > 0) {
        executionFailureCode = 'HUNT_TARGET_RETRIES_EXHAUSTED';
      } else {
        areaCleared = untilEmpty;
      }
      console.log('[hunt:area-cleared]', {
        resource: normalizedTarget,
        hunted,
        acquired: acquiredCount(),
        searchAttempts,
        combatRetries,
        retryExhaustedTargets: retryExhaustedIds.size,
        searchRadius: options.searchRadius || 64
      });
      break;
    }
    if (lockedTarget !== animal) {
      lockedTarget = animal;
      targetRetries = 0;
      console.log('[hunt:target-locked]', {
        id: animal.id,
        mob: animal.name,
        searchRadius: options.searchRadius || 64
      });
    }

    const equipped = await equipWeapon(bot, 'sword');
    console.log('[hunt:equip]', { equipped, heldItem: bot.heldItem?.name || null });
    if (!equipped) {
      return {
        success: false,
        code: 'HUNT_WEAPON_UNAVAILABLE',
        data: {
          resource: normalizedTarget,
          countMode,
          acquired: acquiredCount(),
          hunted
        }
      };
    }

    const waterCombat = Boolean(bot.entity?.isInWater || isEntityInWater(bot, animal));
    const combatAction = waterCombat ? waterAttackTarget : attackTarget;
    console.log('[hunt:combat-mode]', {
      mode: waterCombat ? 'water' : 'land',
      botInWater: Boolean(bot.entity?.isInWater),
      targetInWater: isEntityInWater(bot, animal)
    });
    const combatResult = await combatAction(bot, animal, {
      attackRange: 3,
      maxChaseDistance: waterCombat
        ? (options.maxWaterChaseDistance || 24)
        : (options.maxChaseDistance || 48),
      maxChaseMs: waterCombat
        ? (options.maxWaterChaseMs || 15000)
        : (options.maxChaseMs || 30000),
      minHealth: options.minHealth || 8,
      minOxygen: options.minOxygen || 8,
      maxWaterDepth: options.maxWaterDepth || 3,
      recoverFromWater
    });
    console.log('[hunt:combat]', combatResult);
    if (!combatResult.success) {
      targetRetries += 1;
      combatRetries += 1;

      if (
        combatResult.code === 'COMBAT_TARGET_IN_WATER' ||
        (combatResult.code === 'COMBAT_WATER_RISK' && !bot.entity?.isInWater)
      ) {
        excludedIds.add(animal.id);
        lockedTarget = null;
        targetRetries = 0;
        console.log('[hunt:water-target-skipped]', {
          id: animal.id,
          mob: animal.name
        });
        continue;
      }

      if (combatResult.code === 'COMBAT_WATER_RISK' && bot.entity?.isInWater) {
        const recovered = await recoverFromWater(bot, 'hunt_water');
        console.log('[hunt:water-recovery]', {
          recovered,
          position: bot.entity?.position
        });
        if (recovered && !bot.entity?.isInWater) continue;
        executionFailureCode = 'HUNT_WATER_RECOVERY_FAILED';
        break;
      }

      if (combatResult.code === 'COMBAT_WATER_RECOVERY_FAILED') {
        executionFailureCode = 'HUNT_WATER_RECOVERY_FAILED';
        break;
      }
      if (combatResult.code === 'WATER_COMBAT_RECOVERY_FAILED') {
        executionFailureCode = 'HUNT_WATER_RECOVERY_FAILED';
        break;
      }
      if (combatResult.code === 'WATER_COMBAT_RECOVERED') {
        console.log('[hunt:water-combat-recovered]', combatResult.data);
        continue;
      }
      if (combatResult.code === 'COMBAT_LOW_HEALTH') {
        executionFailureCode = 'HUNT_LOW_HEALTH';
        break;
      }
      if (combatResult.code === 'COMBAT_STOPPED') {
        executionFailureCode = 'HUNT_STOPPED';
        break;
      }

      console.log('[hunt:target-retry]', {
        id: animal.id,
        mob: animal.name,
        retry: targetRetries,
        maxTargetRetries
      });
      if (targetRetries >= maxTargetRetries) {
        retryExhaustedIds.add(animal.id);
        excludedIds.add(animal.id);
        lockedTarget = null;
        targetRetries = 0;
        console.warn('[hunt:target-retries-exhausted]', {
          id: animal.id,
          mob: animal.name,
          maxTargetRetries
        });
      }
      continue;
    }
    excludedIds.add(animal.id);
    lockedTarget = null;
    targetRetries = 0;
    hunted += 1;

    await collectDrops(bot, matcher, { label: normalizedTarget, maxAttempts: 6 });
    await bot.waitForTicks(5);
    console.log('[hunt:progress]', {
      acquired: acquiredCount(),
      hunted,
      countMode,
      requested: requestedCount
    });
  }

  const acquired = acquiredCount();
  const completed = !executionFailureCode &&
    (untilEmpty ? areaCleared : progressCount() >= requestedCount);
  return {
    success: completed,
    code: executionFailureCode || (completed
      ? (untilEmpty ? 'HUNT_AREA_CLEARED' : 'HUNT_COMPLETED')
      : 'HUNT_INCOMPLETE'),
    data: {
      resource: normalizedTarget,
      countMode,
      requested: untilEmpty ? null : requestedCount,
      acquired,
      hunted,
      searchAttempts,
      combatRetries,
      retryExhaustedTargets: retryExhaustedIds.size
    }
  };
}

module.exports = { isAdultAnimal, isEligibleAnimal, findHuntTarget, huntResource };
