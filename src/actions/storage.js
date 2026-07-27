const { goals: { GoalGetToBlock } } = require('mineflayer-pathfinder');

const EQUIPMENT_SLOTS = new Set([5, 6, 7, 8, 45]);

function positionKey(position) {
  return `${position.x},${position.y},${position.z}`;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function frameItem(frame) {
  return frame?.heldItem || frame?.equipment?.[0] || null;
}

function isItemFrame(entity) {
  return entity?.name === 'item_frame' ||
    entity?.name === 'glow_item_frame' ||
    entity?.displayName === 'Item Frame' ||
    entity?.displayName === 'Glow Item Frame';
}

function findNearbyChests(bot, mcData, maxDistance = 32) {
  const blockIds = ['chest', 'trapped_chest']
    .map(name => mcData.blocksByName[name]?.id)
    .filter(id => id != null);
  if (blockIds.length === 0 || typeof bot.findBlocks !== 'function') return [];

  const positions = bot.findBlocks({
    matching: blockIds,
    maxDistance,
    count: 64
  }) || [];

  const unique = new Map();
  for (const position of positions) {
    const block = typeof bot.blockAt === 'function'
      ? bot.blockAt(position)
      : { name: 'chest', position };
    if (!block?.position || !['chest', 'trapped_chest'].includes(block.name)) continue;
    unique.set(positionKey(block.position), block);
  }

  return [...unique.values()].sort((a, b) =>
    a.position.x - b.position.x ||
    a.position.y - b.position.y ||
    a.position.z - b.position.z
  );
}

function mapChestLabels(chests, entities, maxDistance = 2.25) {
  const labels = new Map();
  const frames = Object.values(entities || {})
    .filter(isItemFrame)
    .map(frame => ({ frame, item: frameItem(frame) }))
    .filter(({ frame, item }) => frame.position && item?.name);

  for (const { frame, item } of frames) {
    let nearest = null;
    let nearestDistance = maxDistance * maxDistance;
    for (const chest of chests) {
      const center = {
        x: chest.position.x + 0.5,
        y: chest.position.y + 0.5,
        z: chest.position.z + 0.5
      };
      const distance = distanceSquared(frame.position, center);
      if (distance <= nearestDistance) {
        nearest = chest;
        nearestDistance = distance;
      }
    }
    if (nearest) labels.set(positionKey(nearest.position), item.name);
  }

  return labels;
}

function sortableInventoryItems(bot) {
  return bot.inventory.items()
    .filter(item => item?.name && item.count > 0 && !EQUIPMENT_SLOTS.has(item.slot))
    .map(item => ({
      name: item.name,
      type: item.type,
      metadata: item.metadata,
      count: item.count,
      slot: item.slot
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name) ||
      (a.metadata || 0) - (b.metadata || 0) ||
      (a.slot || 0) - (b.slot || 0)
    );
}

function storageCandidates(itemName, chests, labels, itemIndex = 0) {
  const labeled = chests.filter(chest =>
    labels.get(positionKey(chest.position)) === itemName
  );
  if (labeled.length > 0) return labeled;

  const unlabeled = chests.filter(chest => !labels.has(positionKey(chest.position)));
  if (unlabeled.length === 0) return [];
  const start = itemIndex % unlabeled.length;
  return [...unlabeled.slice(start), ...unlabeled.slice(0, start)];
}

async function depositStack(bot, chestBlock, item) {
  let chest;
  try {
    await bot.pathfinder.goto(new GoalGetToBlock(
      chestBlock.position.x,
      chestBlock.position.y,
      chestBlock.position.z
    ));
    bot.pathfinder.setGoal(null);
    chest = await bot.openChest(chestBlock);
    await chest.deposit(item.type, item.metadata ?? null, item.count);
    return true;
  } catch (error) {
    console.warn('[storage] chest deposit failed:', {
      chest: positionKey(chestBlock.position),
      item: item.name,
      count: item.count,
      error: error.message
    });
    return false;
  } finally {
    try { chest?.close(); } catch (error) {
      console.warn('[storage] chest close failed:', error.message);
    }
    bot.pathfinder.setGoal(null);
  }
}

function chestItemNames(chest) {
  return new Set(chestItems(chest).map(item => item.name));
}

function chestItems(chest) {
  const items = typeof chest?.containerItems === 'function'
    ? chest.containerItems()
    : typeof chest?.items === 'function'
      ? chest.items()
      : [];
  return (items || [])
    .filter(item => item?.name && item.count > 0)
    .map(item => ({
      name: item.name,
      type: item.type,
      metadata: item.metadata ?? null,
      count: item.count
    }));
}

async function inspectChest(bot, chestBlock) {
  let chest;
  try {
    await bot.pathfinder.goto(new GoalGetToBlock(
      chestBlock.position.x,
      chestBlock.position.y,
      chestBlock.position.z
    ));
    bot.pathfinder.setGoal(null);
    chest = await bot.openChest(chestBlock);
    const names = chestItemNames(chest);
    console.log('[storage:inspect]', {
      chest: positionKey(chestBlock.position),
      items: [...names]
    });
    return names;
  } catch (error) {
    console.warn('[storage] chest inspection failed:', {
      chest: positionKey(chestBlock.position),
      error: error.message
    });
    return null;
  } finally {
    try { chest?.close(); } catch (error) {
      console.warn('[storage] chest close failed:', error.message);
    }
    bot.pathfinder.setGoal(null);
  }
}

async function inspectChestStacks(bot, chestBlock) {
  let chest;
  try {
    await bot.pathfinder.goto(new GoalGetToBlock(
      chestBlock.position.x,
      chestBlock.position.y,
      chestBlock.position.z
    ));
    bot.pathfinder.setGoal(null);
    chest = await bot.openChest(chestBlock);
    return chestItems(chest);
  } catch (error) {
    console.warn('[storage] chest stack inspection failed:', {
      chest: positionKey(chestBlock.position),
      error: error.message
    });
    return null;
  } finally {
    try { chest?.close(); } catch (error) {
      console.warn('[storage] chest close failed:', error.message);
    }
    bot.pathfinder.setGoal(null);
  }
}

function createStorageAssignments(items, chests, labels, contents) {
  const assignments = new Map();
  const reserved = new Map();

  for (const chest of chests) {
    const key = positionKey(chest.position);
    const label = labels.get(key);
    if (label) {
      assignments.set(label, [...(assignments.get(label) || []), chest]);
      reserved.set(key, label);
    }
  }

  const itemNames = [...new Set(items.map(item => item.name))];
  for (const itemName of itemNames) {
    if (assignments.has(itemName)) continue;
    const matching = chests.filter(chest => {
      const key = positionKey(chest.position);
      return !labels.has(key) &&
        !reserved.has(key) &&
        contents.get(key)?.has(itemName);
    }).sort((a, b) =>
      (contents.get(positionKey(a.position))?.size || 0) -
      (contents.get(positionKey(b.position))?.size || 0)
    );
    if (matching.length > 0) {
      assignments.set(itemName, matching);
      for (const chest of matching) reserved.set(positionKey(chest.position), itemName);
    }
  }

  for (const itemName of itemNames) {
    if (assignments.has(itemName)) continue;
    const emptyChest = chests.find(chest => {
      const key = positionKey(chest.position);
      return !labels.has(key) &&
        !reserved.has(key) &&
        contents.get(key)?.size === 0;
    });
    if (!emptyChest) continue;
    const key = positionKey(emptyChest.position);
    assignments.set(itemName, [emptyChest]);
    reserved.set(key, itemName);
  }

  return { assignments, reserved };
}

function assignedStorageCandidates(itemName, chests, labels, contents, state) {
  const assigned = state.assignments.get(itemName) || [];
  const overflow = chests.filter(chest => {
    const key = positionKey(chest.position);
    return !labels.has(key) &&
      !state.reserved.has(key) &&
      contents.get(key)?.size === 0;
  });
  return [...assigned, ...overflow];
}

function createConsolidationAssignments(inventoryItems, chests, labels, snapshots) {
  const allItems = [
    ...inventoryItems,
    ...[...snapshots.values()].flat()
  ];
  const contents = new Map(
    chests.map(chest => {
      const key = positionKey(chest.position);
      return [key, new Set((snapshots.get(key) || []).map(item => item.name))];
    })
  );
  const assignments = new Map();
  const reserved = new Map();
  const itemNames = [...new Set(allItems.map(item => item.name))];

  for (const itemName of itemNames) {
    const labeled = chests.filter(chest =>
      labels.get(positionKey(chest.position)) === itemName
    );
    if (labeled.length === 0) continue;
    assignments.set(itemName, labeled);
    for (const chest of labeled) reserved.set(positionKey(chest.position), itemName);
  }

  for (const itemName of itemNames) {
    if (assignments.has(itemName)) continue;
    const destination = chests.find(chest => {
      const key = positionKey(chest.position);
      const names = contents.get(key);
      return !labels.has(key) && !reserved.has(key) &&
        names?.size === 1 && names.has(itemName);
    }) || chests.find(chest => {
      const key = positionKey(chest.position);
      return !labels.has(key) && !reserved.has(key) &&
        contents.get(key)?.has(itemName);
    });
    if (!destination) continue;
    assignments.set(itemName, [destination]);
    reserved.set(positionKey(destination.position), itemName);
  }

  for (const itemName of itemNames) {
    if (assignments.has(itemName)) continue;
    const destination = chests.find(chest => {
      const key = positionKey(chest.position);
      return !labels.has(key) && !reserved.has(key) && contents.get(key)?.size === 0;
    });
    if (!destination) continue;
    assignments.set(itemName, [destination]);
    reserved.set(positionKey(destination.position), itemName);
  }

  return { assignments, reserved, contents };
}

async function withdrawStack(bot, chestBlock, item) {
  let chest;
  try {
    await bot.pathfinder.goto(new GoalGetToBlock(
      chestBlock.position.x,
      chestBlock.position.y,
      chestBlock.position.z
    ));
    bot.pathfinder.setGoal(null);
    chest = await bot.openChest(chestBlock);
    await chest.withdraw(item.type, item.metadata ?? null, item.count);
    return true;
  } catch (error) {
    console.warn('[storage] chest withdrawal failed:', {
      chest: positionKey(chestBlock.position),
      item: item.name,
      count: item.count,
      error: error.message
    });
    return false;
  } finally {
    try { chest?.close(); } catch (error) {
      console.warn('[storage] chest close failed:', error.message);
    }
    bot.pathfinder.setGoal(null);
  }
}

async function transferStack(bot, source, destination, item) {
  if (!await withdrawStack(bot, source, item)) return false;
  if (await depositStack(bot, destination, item)) return true;

  console.warn('[storage:rollback]', {
    item: item.name,
    count: item.count,
    source: positionKey(source.position),
    destination: positionKey(destination.position)
  });
  await depositStack(bot, source, item);
  return false;
}

async function consolidateChests(bot, chests, labels, snapshots, state) {
  const moved = {};
  const unmoved = {};

  for (const source of chests) {
    const sourceKey = positionKey(source.position);
    for (const item of snapshots.get(sourceKey) || []) {
      if (bot.isStopped) return { moved, unmoved, stopped: true };
      const destinations = state.assignments.get(item.name) || [];
      const destination = destinations.find(chest =>
        positionKey(chest.position) !== sourceKey
      );
      const sourceIsDestination = destinations.some(chest =>
        positionKey(chest.position) === sourceKey
      );
      if (sourceIsDestination) continue;
      if (!destination) {
        unmoved[item.name] = (unmoved[item.name] || 0) + item.count;
        continue;
      }

      if (await transferStack(bot, source, destination, item)) {
        moved[item.name] = (moved[item.name] || 0) + item.count;
      } else {
        unmoved[item.name] = (unmoved[item.name] || 0) + item.count;
      }
    }
  }
  return { moved, unmoved, stopped: false };
}

async function sortInventory(bot, mcData, options = {}) {
  const maxDistance = options.maxDistance || 32;
  const chests = findNearbyChests(bot, mcData, maxDistance);
  if (chests.length === 0) {
    return {
      success: false,
      code: 'STORAGE_CHEST_NOT_FOUND',
      data: { maxDistance }
    };
  }

  const labels = mapChestLabels(chests, bot.entities);
  let items = sortableInventoryItems(bot);
  const snapshots = new Map();
  for (const chest of chests) {
    if (bot.isStopped) break;
    const stacks = await inspectChestStacks(bot, chest);
    if (stacks) snapshots.set(positionKey(chest.position), stacks);
  }
  const assignmentState = createConsolidationAssignments(
    items,
    chests,
    labels,
    snapshots
  );
  const contents = assignmentState.contents;
  const consolidation = await consolidateChests(
    bot,
    chests,
    labels,
    snapshots,
    assignmentState
  );
  console.log('[storage:consolidation]', consolidation);
  items = sortableInventoryItems(bot);
  const stored = {};
  const unstored = {};

  console.log('[storage:start]', {
    chests: chests.map(chest => ({
      position: chest.position,
      label: labels.get(positionKey(chest.position)) || null
    })),
    items: items.map(item => ({ name: item.name, count: item.count, slot: item.slot }))
  });

  for (const item of items) {
    if (bot.isStopped) {
      return {
        success: false,
        code: 'STORAGE_STOPPED',
        data: { stored, unstored, consolidated: consolidation.moved }
      };
    }

    const candidates = assignedStorageCandidates(
      item.name,
      chests,
      labels,
      contents,
      assignmentState
    );
    let deposited = false;
    for (const chest of candidates) {
      if (await depositStack(bot, chest, item)) {
        const key = positionKey(chest.position);
        assignmentState.reserved.set(key, item.name);
        if (!assignmentState.assignments.has(item.name)) {
          assignmentState.assignments.set(item.name, [chest]);
        } else if (!assignmentState.assignments.get(item.name).includes(chest)) {
          assignmentState.assignments.get(item.name).push(chest);
        }
        contents.set(key, new Set([item.name]));
        stored[item.name] = (stored[item.name] || 0) + item.count;
        deposited = true;
        break;
      }
    }
    if (!deposited) {
      unstored[item.name] = (unstored[item.name] || 0) + item.count;
    }
  }

  console.log('[storage:complete]', { stored, unstored });
  if (Object.keys(unstored).length > 0 ||
      Object.keys(consolidation.unmoved).length > 0) {
    return {
      success: false,
      code: 'STORAGE_PARTIAL',
      data: {
        stored,
        unstored,
        consolidated: consolidation.moved,
        unconsolidated: consolidation.unmoved,
        chestCount: chests.length
      }
    };
  }

  return {
    success: true,
    code: 'INVENTORY_SORTED',
    data: {
      stored,
      consolidated: consolidation.moved,
      unconsolidated: consolidation.unmoved,
      chestCount: chests.length
    }
  };
}

module.exports = {
  depositStack,
  assignedStorageCandidates,
  chestItemNames,
  chestItems,
  consolidateChests,
  createConsolidationAssignments,
  createStorageAssignments,
  findNearbyChests,
  frameItem,
  isItemFrame,
  inspectChest,
  inspectChestStacks,
  mapChestLabels,
  positionKey,
  sortableInventoryItems,
  sortInventory,
  storageCandidates,
  transferStack,
  withdrawStack
};
