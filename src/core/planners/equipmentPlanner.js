const craftingPlanner = require('./craftingPlanner');
const equipmentData = require('../../data/equipmentData');

function inventoryItems(bot) {
  return bot?.inventory && typeof bot.inventory.items === 'function'
    ? bot.inventory.items()
    : [];
}

function resolveRequestedItems(task) {
  const target = task?.target;
  if (equipmentData.equipmentByItem[target]) return [target];

  if (target === 'armor' || target === 'best_armor') return [];

  const material = target?.replace(/_armor(?:_set)?$/, '');
  return equipmentData.sets[material] || null;
}

function equippedItem(bot, piece) {
  const slot = equipmentData.slots[piece];
  return inventoryItems(bot).find(item => item.slot === slot.inventorySlot) || null;
}

function bestOwnedByPiece(bot, piece) {
  const owned = new Set(inventoryItems(bot).map(item => item.name));
  return equipmentData.materialPriority
    .map(material => `${material}_${piece}`)
    .filter(itemName => owned.has(itemName))
    .at(-1) || null;
}

function shouldEquip(bot, itemName, explicitRequest = true) {
  const requested = equipmentData.equipmentByItem[itemName];
  const current = equippedItem(bot, requested.piece);
  if (!current || current.name === itemName) return current?.name !== itemName;
  if (explicitRequest) return true;

  const currentData = equipmentData.equipmentByItem[current.name];
  return !currentData || requested.rank > currentData.rank;
}

function equipmentDistribution(task) {
  const total = Math.max(1, Math.floor(Number(task?.count) || 1));
  const hasKeep = task?.keep != null;
  const hasGive = task?.give != null;
  let keep = hasKeep ? Math.max(0, Math.floor(Number(task.keep) || 0)) : null;
  let give = hasGive ? Math.max(0, Math.floor(Number(task.give) || 0)) : null;

  if (keep == null && give == null) {
    keep = total;
    give = 0;
  } else if (keep == null) {
    keep = total - give;
  } else if (give == null) {
    give = total - keep;
  }

  if (keep < 0 || give < 0 || keep + give !== total) {
    throw new craftingPlanner.UnsupportedMaterialError(
      task?.target,
      `장비 배분 수량이 맞지 않습니다. 전체 ${total}, 보관 ${keep}, 전달 ${give}.`
    );
  }

  const equip = task?.equip !== false;
  if (equip && keep < 1) {
    throw new craftingPlanner.UnsupportedMaterialError(
      task?.target,
      '장착하려면 봇이 보관할 장비가 부위별로 최소 1개 필요합니다.'
    );
  }

  return { total, keep, give, equip };
}

function createPlan(bot, task, options = {}) {
  console.log('[equipment-planner:goal]', task);
  const requested = resolveRequestedItems(task);
  if (requested === null) {
    throw new craftingPlanner.UnsupportedMaterialError(
      task?.target,
      '등록된 방어구 또는 방어구 세트가 아닙니다.'
    );
  }

  const bestArmorRequest = task.target === 'armor' || task.target === 'best_armor';
  if (bestArmorRequest && (task.give != null || task.keep != null || Number(task.count) > 1)) {
    throw new craftingPlanner.UnsupportedMaterialError(
      task.target,
      'best_armor는 보유 장비 장착 전용이므로 제작 또는 전달 수량을 지정할 수 없습니다.'
    );
  }
  const distribution = bestArmorRequest
    ? { total: 1, keep: 1, give: 0, equip: true }
    : equipmentDistribution(task);
  const targets = bestArmorRequest
    ? Object.keys(equipmentData.slots)
      .map(piece => bestOwnedByPiece(bot, piece))
      .filter(Boolean)
    : requested;

  const stock = new Map(
    inventoryItems(bot).map(item => [item.name, (item.count || 0)])
  );
  const steps = [];
  console.log('[equipment-planner:distribution]', distribution);

  for (const itemName of targets) {
    const equipment = equipmentData.equipmentByItem[itemName];
    const owned = stock.get(itemName) || 0;
    console.log('[equipment-planner:item]', {
      item: itemName,
      piece: equipment.piece,
      rank: equipment.rank,
      owned,
      equipped: equippedItem(bot, equipment.piece)?.name || null
    });

    if (owned < distribution.total) {
      if (equipment.material === 'chainmail') {
        throw new craftingPlanner.UnsupportedMaterialError(
          itemName,
          '사슬 방어구는 일반 제작 레시피가 없습니다.'
        );
      }
      if (equipment.material === 'netherite') {
        throw new craftingPlanner.UnsupportedMaterialError(
          itemName,
          '네더라이트 방어구 제작에는 대장장이 작업대 업그레이드 기능이 필요합니다.'
        );
      }
      steps.push(...craftingPlanner.createCraftingPlan(
        bot,
        { action: 'craftCommand', target: itemName, count: distribution.total },
        { ...options, stock }
      ));
    }

    if (distribution.give > 0) {
      steps.push({
        action: 'tossCommand',
        target: itemName,
        count: distribution.give,
        excludeEquipmentSlots: true
      });
      stock.set(itemName, (stock.get(itemName) || 0) - distribution.give);
    }

    if (
      distribution.equip &&
      shouldEquip(bot, itemName, !bestArmorRequest)
    ) {
      steps.push({ action: 'equipCommand', target: itemName, count: 1 });
    }
  }

  console.log('[equipment-planner:result]', steps);
  return steps;
}

module.exports = {
  domain: 'equipment',
  canHandle(task) {
    return task?.action === 'equipmentCommand';
  },
  createPlan,
  bestOwnedByPiece,
  equippedItem,
  resolveRequestedItems,
  shouldEquip,
  equipmentDistribution
};
