const { Vec3 } = require('vec3');
const { goals: { GoalFollow } } = require('mineflayer-pathfinder');
const { collectMatchingItems } = require('./itemSearch');
const { distanceBetween } = require('./combat');

const BOAT_NAMES = new Set([
  'oak_boat', 'spruce_boat', 'birch_boat', 'jungle_boat',
  'acacia_boat', 'dark_oak_boat', 'mangrove_boat',
  'cherry_boat', 'pale_oak_boat'
]);
const WATER_NAMES = new Set(['water', 'flowing_water', 'bubble_column']);

function findBoatItem(bot) {
  return (bot.inventory?.items?.() || []).find(item => BOAT_NAMES.has(item.name)) || null;
}

function isWaterBlock(block) {
  return WATER_NAMES.has(block?.name);
}

function findBoatPlacementWater(bot, maxDistance = 5) {
  if (typeof bot.findBlock !== 'function') return null;
  return bot.findBlock({ matching: block => isWaterBlock(block), maxDistance });
}

function boatIsOnWater(bot, boat) {
  if (!boat?.position || typeof bot.blockAt !== 'function') return false;
  const p = boat.position.floored?.() || {
    x: Math.floor(boat.position.x),
    y: Math.floor(boat.position.y),
    z: Math.floor(boat.position.z)
  };
  return isWaterBlock(bot.blockAt(p)) ||
    isWaterBlock(bot.blockAt(new Vec3(p.x, p.y - 1, p.z)));
}

async function waitUntilMounted(bot, boat, ticks = 40) {
  for (let elapsed = 0; elapsed < ticks; elapsed += 2) {
    if (bot.vehicle === boat || bot.entity?.vehicle === boat) return true;
    await bot.waitForTicks?.(2);
  }
  return bot.vehicle === boat || bot.entity?.vehicle === boat;
}

async function recoverBoat(bot, boat, boatName, options = {}) {
  if (boat?.isValid !== false) {
    try {
      for (let attempts = 0;
           attempts < (options.breakAttempts || 6) && boat.isValid !== false;
           attempts += 1) {
        await bot.lookAt?.(boat.position.offset?.(0, 0.5, 0) || boat.position, true);
        await bot.attack?.(boat);
        await bot.waitForTicks?.(4);
      }
    } catch (error) {
      console.warn('[boat:break-failed]', error.message);
    }
  }

  const pickedUp = await collectMatchingItems(bot, name => name === boatName, {
    maxAttempts: options.pickupAttempts || 8,
    label: boatName
  });
  console.log('[boat:recovered]', { boat: boatName, pickedUp });
  return pickedUp;
}

async function travelByBoat(bot, getTargetPosition, options = {}) {
  const boatItem = findBoatItem(bot);
  if (!boatItem) return { success: false, code: 'BOAT_UNAVAILABLE', data: {} };
  const water = findBoatPlacementWater(bot, options.placementRange || 5);
  if (!water) {
    return { success: false, code: 'BOAT_PLACEMENT_WATER_NOT_FOUND', data: {} };
  }

  let boat;
  let mounted = false;
  let recoveryAttempted = false;
  let recovered = false;
  let travelTicks = 0;
  const range = options.range || 3;
  const recover = options.recoverBoat || recoverBoat;

  try {
    bot.pathfinder?.setGoal(null);
    await bot.equip(boatItem, 'hand');
    boat = await bot.placeEntity(water, new Vec3(0, 1, 0));
    console.log('[boat:placed]', { boat: boatItem.name, position: boat?.position });
    bot.mount(boat);
    mounted = await waitUntilMounted(bot, boat, options.mountTicks || 40);
    if (!mounted) {
      return { success: false, code: 'BOAT_MOUNT_FAILED', data: { boat: boatItem.name } };
    }

    let dryTicks = 0;
    let stagnantTicks = 0;
    let previousPosition = boat.position
      ? { x: boat.position.x, y: boat.position.y, z: boat.position.z }
      : null;
    const maxTravelTicks = options.maxTravelTicks || 1200;
    while (!bot.isStopped && boat?.isValid !== false && travelTicks < maxTravelTicks) {
      const target = getTargetPosition?.();
      if (!target) {
        return { success: false, code: 'BOAT_TARGET_UNAVAILABLE', data: { travelTicks } };
      }
      const current = boat.position || bot.entity?.position;
      if (distanceBetween(current, target) <= range + 2) break;

      await bot.lookAt(new Vec3(target.x, current.y, target.z), true);
      bot.moveVehicle(0, 1);
      await bot.waitForTicks?.(2);
      travelTicks += 2;

      const moved = previousPosition
        ? distanceBetween(previousPosition, boat.position) > 0.15
        : true;
      stagnantTicks = moved ? 0 : stagnantTicks + 2;
      previousPosition = boat.position
        ? { x: boat.position.x, y: boat.position.y, z: boat.position.z }
        : previousPosition;
      if (stagnantTicks >= (options.maxStagnantTicks || 20)) {
        console.log('[boat:shore-reached]', { position: boat.position, travelTicks });
        break;
      }

      if (boatIsOnWater(bot, boat)) dryTicks = 0;
      else if ((dryTicks += 2) >= 8) break;
    }

    bot.moveVehicle(0, 0);
    bot.dismount();
    await bot.waitForTicks?.(6);
    recoveryAttempted = true;
    recovered = await recover(bot, boat, boatItem.name, options);
    return {
      success: !bot.isStopped,
      code: bot.isStopped ? 'BOAT_TRAVEL_STOPPED' : 'BOAT_TRAVEL_COMPLETED',
      data: { boat: boatItem.name, travelTicks, recovered }
    };
  } catch (error) {
    console.error('[boat:travel-failed]', error.message);
    return {
      success: false,
      code: 'BOAT_TRAVEL_FAILED',
      data: { boat: boatItem.name, travelTicks, error: error.message }
    };
  } finally {
    try { bot.moveVehicle?.(0, 0); } catch {}
    if (mounted && bot.vehicle) {
      try { bot.dismount(); } catch {}
    }
    if (boat && !recoveryAttempted && !bot.vehicle) {
      await recover(bot, boat, boatItem.name, options);
    }
  }
}

async function travelToEntityWithBoat(bot, entity, range = 3, options = {}) {
  if (!entity?.position) return false;
  const travel = {
    mode: options.mode || 'return_to_player',
    range,
    getPosition: () => entity?.position,
    resume: () => bot.pathfinder.setGoal(new GoalFollow(entity, range), true)
  };
  bot._activeTravelTarget = travel;
  travel.resume();
  try {
    const maxTicks = options.maxTicks || 2400;
    for (let elapsed = 0; elapsed < maxTicks; elapsed += 2) {
      if (bot.isStopped) return false;
      if (distanceBetween(bot.entity?.position, entity.position) <= range + 0.5) return true;
      await bot.waitForTicks?.(2);
    }
    return false;
  } finally {
    if (bot._activeTravelTarget === travel) bot._activeTravelTarget = null;
    bot.pathfinder?.setGoal(null);
  }
}

module.exports = {
  BOAT_NAMES,
  boatIsOnWater,
  findBoatItem,
  findBoatPlacementWater,
  recoverBoat,
  travelByBoat,
  travelToEntityWithBoat,
  waitUntilMounted
};
