const { goals: { GoalNear } } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

function isWoodenDoor(block) {
  const name = typeof block === 'string' ? block : block?.name;
  return Boolean(
    name &&
    name.endsWith('_door') &&
    !name.endsWith('_trapdoor') &&
    name !== 'iron_door'
  );
}

function isIronDoor(block) {
  const name = typeof block === 'string' ? block : block?.name;
  return name === 'iron_door';
}

function isSupportedDoor(block) {
  return isWoodenDoor(block) || isIronDoor(block);
}

function isPressurePlate(block) {
  const name = typeof block === 'string' ? block : block?.name;
  return Boolean(name?.endsWith('_pressure_plate'));
}

function doorProperties(block) {
  if (!block) return {};
  if (typeof block.getProperties === 'function') {
    try {
      return block.getProperties() || {};
    } catch (error) {
      console.warn('[doorInteraction] door properties unavailable:', error.message);
    }
  }
  return block.properties || {};
}

function isDoorOpen(block) {
  return doorProperties(block).open === true;
}

function configureDoorInteractions(bot, mcData, movements = bot.pathfinder?.movements) {
  if (!movements || !mcData?.blocksArray) return 0;

  let registered = 0;
  for (const block of mcData.blocksArray) {
    if (!isWoodenDoor(block) || movements.openable.has(block.id)) continue;
    movements.openable.add(block.id);
    registered += 1;
  }
  movements.canOpenDoors = true;
  console.log('[doorInteraction:configured]', {
    woodenDoorTypes: registered,
    canOpenDoors: movements.canOpenDoors
  });
  return registered;
}

function goalPosition(goal) {
  if (goal?.entity?.position) return goal.entity.position;
  if (Number.isFinite(goal?.x) && Number.isFinite(goal?.z)) {
    return { x: goal.x, y: goal.y, z: goal.z };
  }
  return null;
}

function isDoorTowardGoal(bot, door, goal) {
  const from = bot.entity?.position;
  const target = goalPosition(goal);
  const doorPosition = door?.position;
  if (!from || !target || !doorPosition) return true;

  const doorX = doorPosition.x + 0.5 - from.x;
  const doorZ = doorPosition.z + 0.5 - from.z;
  const goalX = target.x - from.x;
  const goalZ = target.z - from.z;
  return doorX * goalX + doorZ * goalZ >= 0;
}

function doorKey(door) {
  const position = door?.position;
  return position ? `${position.x},${position.y},${position.z}` : null;
}

function lowerDoorBlock(bot, door) {
  if (!door?.position || typeof bot.blockAt !== 'function') return door;
  if (doorProperties(door).half !== 'upper') return door;
  const below = door.position.offset
    ? door.position.offset(0, -1, 0)
    : { x: door.position.x, y: door.position.y - 1, z: door.position.z };
  return bot.blockAt(below) || door;
}

function findNearbyClosedDoor(
  bot,
  maxDistance = 4,
  goal = bot.pathfinder?.goal,
  options = {}
) {
  if (typeof bot.findBlock !== 'function') return null;
  const excludedDoorKeys = options.excludedDoorKeys || new Set();
  const requireTowardGoal = options.requireTowardGoal !== false;
  return bot.findBlock({
    matching: block => (
      isSupportedDoor(block) &&
      (options.includeOpen || !isDoorOpen(block)) &&
      !excludedDoorKeys.has(doorKey(block)) &&
      (!requireTowardGoal || isDoorTowardGoal(bot, block, goal))
    ),
    maxDistance
  });
}

function distanceToBlock(bot, block) {
  const from = bot.entity?.position;
  const to = block?.position;
  if (!from || !to) return Infinity;
  if (typeof from.distanceTo === 'function') return from.distanceTo(to);
  return Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
}

async function openDoor(bot, door, options = {}) {
  if (!isWoodenDoor(door)) {
    console.warn('[doorInteraction] unsupported door:', door?.name);
    return false;
  }
  if (isDoorOpen(door)) return true;

  let approachedDoor = false;
  try {
    if (distanceToBlock(bot, door) > (options.reachDistance || 4)) {
      approachedDoor = true;
      await bot.pathfinder.goto(new GoalNear(
        door.position.x,
        door.position.y,
        door.position.z,
        2
      ));
    }
    await bot.activateBlock(door);
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(2);

    const refreshed = typeof bot.blockAt === 'function'
      ? bot.blockAt(door.position)
      : null;
    const opened = refreshed ? isDoorOpen(refreshed) : true;
    console.log('[doorInteraction:open]', {
      door: door.name,
      position: door.position,
      opened
    });
    return opened;
  } catch (error) {
    console.error('[doorInteraction] failed to open door:', error.message);
    return false;
  } finally {
    if (approachedDoor) bot.pathfinder?.setGoal(null);
  }
}

function findPressurePlateForDoor(bot, door, maxOffset = 2) {
  if (!door?.position || typeof bot.blockAt !== 'function') return null;
  const lowerDoor = lowerDoorBlock(bot, door);
  const position = lowerDoor?.position || door.position;
  const candidates = [];

  for (let x = -maxOffset; x <= maxOffset; x += 1) {
    for (let z = -maxOffset; z <= maxOffset; z += 1) {
      if (x === 0 && z === 0) continue;
      if (Math.abs(x) + Math.abs(z) > maxOffset) continue;
      for (const y of [0, -1]) {
        const platePosition = position.offset
          ? position.offset(x, y, z)
          : { x: position.x + x, y: position.y + y, z: position.z + z };
        const block = bot.blockAt(platePosition);
        if (isPressurePlate(block)) candidates.push(block);
      }
    }
  }

  return candidates.sort(
    (left, right) => distanceToBlock(bot, left) - distanceToBlock(bot, right)
  )[0] || null;
}

async function openIronDoorWithPressurePlate(bot, door, options = {}) {
  if (!isIronDoor(door)) return false;
  if (isDoorOpen(door)) return true;

  const lowerDoor = lowerDoorBlock(bot, door);
  const pressurePlate = findPressurePlateForDoor(
    bot,
    lowerDoor,
    options.pressurePlateSearchRadius || 2
  );
  if (!pressurePlate) {
    console.warn('[doorInteraction:pressure-plate-missing]', {
      door: door.name,
      position: lowerDoor?.position || door.position
    });
    return false;
  }

  try {
    console.log('[doorInteraction:pressure-plate]', {
      door: door.name,
      doorPosition: lowerDoor.position,
      plate: pressurePlate.name,
      platePosition: pressurePlate.position
    });
    await bot.pathfinder.goto(new GoalNear(
      pressurePlate.position.x,
      pressurePlate.position.y,
      pressurePlate.position.z,
      0
    ));
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(2);

    const refreshed = bot.blockAt(lowerDoor.position);
    const opened = refreshed ? isDoorOpen(refreshed) : false;
    console.log('[doorInteraction:iron-open]', {
      door: door.name,
      position: lowerDoor.position,
      opened
    });
    return opened;
  } catch (error) {
    console.error('[doorInteraction] failed to use pressure plate:', error.message);
    return false;
  } finally {
    bot.pathfinder?.setGoal(null);
  }
}

async function prepareDoorPassage(bot, door, options = {}) {
  if (isIronDoor(door)) return openIronDoorWithPressurePlate(bot, door, options);
  return openDoor(bot, door, options);
}

async function closeDoorAfterPassage(bot, door, options = {}) {
  if (!door?.position || typeof bot.blockAt !== 'function') return false;
  const position = lowerDoorBlock(bot, door)?.position || door.position;
  const waitTicks = options.waitTicks || 24;

  if (isIronDoor(door)) {
    for (let tick = 0; tick < waitTicks; tick += 2) {
      const refreshed = bot.blockAt(position);
      if (refreshed && !isDoorOpen(refreshed)) {
        console.log('[doorInteraction:closed]', {
          door: door.name,
          position,
          method: 'pressure_plate'
        });
        return true;
      }
      if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(2);
    }
    console.warn('[doorInteraction] iron door remained open:', position);
    return false;
  }

  if (!isWoodenDoor(door)) return false;
  const refreshed = bot.blockAt(position);
  if (!refreshed || !isDoorOpen(refreshed)) return true;
  try {
    await bot.activateBlock(refreshed);
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(2);
    const closed = !isDoorOpen(bot.blockAt(position));
    console.log('[doorInteraction:closed]', {
      door: door.name,
      position,
      method: 'activate',
      closed
    });
    return closed;
  } catch (error) {
    console.error('[doorInteraction] failed to close door:', error.message);
    return false;
  }
}

async function openNearbyDoor(bot, maxDistance = 4) {
  const door = findNearbyClosedDoor(bot, maxDistance);
  if (!door) return false;
  return prepareDoorPassage(bot, door);
}

function doorwayExitPosition(bot, door, distance = 1.75) {
  const from = bot.entity?.position;
  const doorPosition = door?.position;
  if (!from || !doorPosition) return null;

  const centerX = doorPosition.x + 0.5;
  const centerZ = doorPosition.z + 0.5;
  const dx = centerX - from.x;
  const dz = centerZ - from.z;
  const y = Math.floor(from.y);
  const facing = doorProperties(door).facing;

  // A north/south-facing closed door lies on the Z plane, so it must be
  // crossed along Z. East/west doors are crossed along X.
  if (facing === 'east' || facing === 'west' ||
      (!facing && Math.abs(dx) >= Math.abs(dz))) {
    const direction = Math.sign(dx) || 1;
    return new Vec3(centerX + direction * distance, y, centerZ);
  }

  if (facing === 'north' || facing === 'south' || !facing) {
    const direction = Math.sign(dz) || 1;
    return new Vec3(centerX, y, centerZ + direction * distance);
  }

  return null;
}

function crossedDoorPlane(from, to, door) {
  if (!from || !to || !door?.position) return false;
  const centerX = door.position.x + 0.5;
  const centerZ = door.position.z + 0.5;
  const facing = doorProperties(door).facing;
  const usesXAxis = facing === 'east' || facing === 'west' ||
    (!facing && Math.abs(centerX - from.x) >= Math.abs(centerZ - from.z));
  const before = usesXAxis ? from.x - centerX : from.z - centerZ;
  const after = usesXAxis ? to.x - centerX : to.z - centerZ;
  return before * after <= 0 && Math.abs(after) >= 0.35;
}

async function passThroughDoor(bot, door) {
  const exit = doorwayExitPosition(bot, door);
  if (
    !exit ||
    typeof bot.lookAt !== 'function' ||
    typeof bot.setControlState !== 'function'
  ) {
    return false;
  }

  const from = bot.entity.position.clone
    ? bot.entity.position.clone()
    : { ...bot.entity.position };

  try {
    await bot.lookAt(new Vec3(exit.x, exit.y + 1, exit.z), true);
    bot.setControlState('forward', true);
    bot.setControlState('sprint', true);

    for (let tick = 0; tick < 32; tick += 1) {
      if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(1);
      const position = bot.entity?.position;
      if (!position) break;
      const remaining = Math.hypot(exit.x - position.x, exit.z - position.z);
      if (remaining <= 0.7) break;

      if (tick === 12) {
        const distanceMoved = Math.hypot(position.x - from.x, position.z - from.z);
        if (distanceMoved < 0.3) bot.setControlState('jump', true);
      }
      if (tick === 14) bot.setControlState('jump', false);
    }

    const position = bot.entity?.position;
    const moved = Boolean(
      position &&
      Math.hypot(position.x - from.x, position.z - from.z) >= 0.8
    );
    const crossed = crossedDoorPlane(from, position, door);
    console.log('[doorInteraction:pass]', {
      door: door.name,
      facing: doorProperties(door).facing || null,
      from,
      exit,
      position,
      moved,
      crossed
    });
    return crossed;
  } finally {
    bot.setControlState('forward', false);
    bot.setControlState('sprint', false);
    bot.setControlState('jump', false);
  }
}

function registerDoorInteractionEvents(bot, options = {}) {
  if (bot._doorInteractionEventsRegistered) return;
  bot._doorInteractionEventsRegistered = true;
  let openingDoor = false;
  let lastAttemptAt = 0;
  let pendingRecovery = null;
  let pendingRecoveryTimer = null;
  let lastStuckLogAt = 0;
  const recentlyPassedDoors = new Map();
  const retryDelayMs = options.retryDelayMs || 1000;
  const passedDoorCooldownMs = options.passedDoorCooldownMs || 10000;

  function activePassedDoorKeys() {
    const now = Date.now();
    for (const [key, passedAt] of recentlyPassedDoors) {
      if (now - passedAt >= passedDoorCooldownMs) recentlyPassedDoors.delete(key);
    }
    return new Set(recentlyPassedDoors.keys());
  }

  async function recoverWithNearbyDoor(reason, detail = null) {
    const originalGoal = bot.pathfinder?.goal || null;
    const excludedDoorKeys = activePassedDoorKeys();
    let searchMode = 'nearby';
    let door = findNearbyClosedDoor(
      bot,
      options.maxDistance || 6,
      originalGoal,
      { excludedDoorKeys, includeOpen: true }
    );
    if (!door) {
      searchMode = 'wall_entrance';
      door = findNearbyClosedDoor(
        bot,
        options.doorSearchRadius || 64,
        originalGoal,
        {
          excludedDoorKeys,
          includeOpen: true,
          requireTowardGoal: false
        }
      );
    }
    if (!door) return false;

    openingDoor = true;
    lastAttemptAt = Date.now();
    const dynamicGoal = Boolean(originalGoal?.entity);
    console.warn('[doorInteraction:recovery]', {
      reason,
      detail,
      searchMode,
      door: door.name,
      position: door.position
    });
    try {
      const opened = await prepareDoorPassage(bot, door, {
        reachDistance: 5,
        pressurePlateSearchRadius: options.pressurePlateSearchRadius || 2
      });
      if (opened && originalGoal) {
        // A timeout leaves the old route unusable. Stop it, physically pass
        // the opened doorway, and only then restore the final destination.
        bot.pathfinder.setGoal(null);
        const passed = await passThroughDoor(bot, door);
        if (passed) {
          const key = doorKey(door);
          if (key) recentlyPassedDoors.set(key, Date.now());
          await closeDoorAfterPassage(bot, door);
        }
        bot.pathfinder.setGoal(originalGoal, dynamicGoal);
        console.log('[doorInteraction:replan]', {
          reason,
          dynamicGoal,
          goal: originalGoal.constructor?.name || 'Goal',
          passedDoor: passed
        });
      }
      if (opened) {
        pendingRecovery = null;
        if (pendingRecoveryTimer) {
          clearTimeout(pendingRecoveryTimer);
          pendingRecoveryTimer = null;
        }
      }
      return opened;
    } finally {
      openingDoor = false;
    }
  }

  function scheduleDoorRecovery(reason, detail = null) {
    pendingRecovery = { reason, detail };
    if (pendingRecoveryTimer) return;

    const elapsed = Date.now() - lastAttemptAt;
    const cooldownRemaining = Math.max(0, retryDelayMs - elapsed);
    const delay = openingDoor
      ? Math.max(50, retryDelayMs)
      : Math.max(0, cooldownRemaining);

    pendingRecoveryTimer = setTimeout(async () => {
      pendingRecoveryTimer = null;
      if (!pendingRecovery) return;
      if (openingDoor) {
        const queued = pendingRecovery;
        scheduleDoorRecovery(queued.reason, queued.detail);
        return;
      }

      const queued = pendingRecovery;
      pendingRecovery = null;
      try {
        await recoverWithNearbyDoor(queued.reason, queued.detail);
      } catch (error) {
        console.error('[doorInteraction] recovery failed:', error.message);
      }
    }, delay);
    pendingRecoveryTimer.unref?.();
  }

  function requestDoorRecovery(reason, detail = null) {
    if (openingDoor || Date.now() - lastAttemptAt < retryDelayMs) {
      console.log('[doorInteraction:recovery-queued]', {
        reason,
        detail,
        openingDoor
      });
      scheduleDoorRecovery(reason, detail);
      return;
    }
    recoverWithNearbyDoor(reason, detail)
      .catch(error => console.error('[doorInteraction] recovery failed:', error.message));
  }

  bot.on('path_update', result => {
    if (!result || ['success', 'partial'].includes(result.status)) return;
    console.warn('[pathfinder:path-update]', {
      status: result.status,
      pathLength: result.path?.length || 0,
      visitedNodes: result.visitedNodes
    });
    requestDoorRecovery('path_update', result.status);
  });

  bot.on('path_reset', reason => {
    if (!['stuck', 'place_error'].includes(reason)) return;
    const now = Date.now();
    if (reason !== 'stuck' || now - lastStuckLogAt >= retryDelayMs) {
      console.warn('[pathfinder:path-reset]', { reason });
      if (reason === 'stuck') lastStuckLogAt = now;
    }
    if (reason !== 'stuck') return;
    requestDoorRecovery('path_reset', reason);
  });
}

module.exports = {
  isWoodenDoor,
  isIronDoor,
  isSupportedDoor,
  isPressurePlate,
  isDoorOpen,
  configureDoorInteractions,
  findNearbyClosedDoor,
  doorwayExitPosition,
  crossedDoorPlane,
  passThroughDoor,
  openDoor,
  findPressurePlateForDoor,
  openIronDoorWithPressurePlate,
  prepareDoorPassage,
  closeDoorAfterPassage,
  openNearbyDoor,
  registerDoorInteractionEvents
};
