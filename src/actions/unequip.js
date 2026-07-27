const equipmentData = require('../data/equipmentData');

const ALL_TARGETS = new Set([
  'all', 'armor', 'all_armor', 'equipment', 'all_equipment', 'item'
]);

function resolveUnequipTargets(target) {
  if (ALL_TARGETS.has(target)) {
    return Object.entries(equipmentData.slots).map(([piece, slot]) => ({
      piece,
      ...slot
    }));
  }

  const exactItem = equipmentData.equipmentByItem[target];
  if (exactItem) return [{ ...exactItem, expectedItem: target }];

  if (equipmentData.slots[target]) {
    return [{ piece: target, ...equipmentData.slots[target] }];
  }

  const byDestination = Object.entries(equipmentData.slots)
    .find(([, slot]) => slot.destination === target);
  return byDestination
    ? [{ piece: byDestination[0], ...byDestination[1] }]
    : [];
}

function equippedItem(bot, inventorySlot) {
  return bot.inventory?.slots?.[inventorySlot] || null;
}

async function unequipArmor(bot, target = 'all') {
  const targets = resolveUnequipTargets(target);
  if (targets.length === 0) {
    return {
      success: false,
      code: 'EQUIPMENT_UNEQUIP_UNSUPPORTED',
      data: { target }
    };
  }

  const equipped = targets
    .map(slot => ({ slot, item: equippedItem(bot, slot.inventorySlot) }))
    .filter(({ slot, item }) =>
      item && (!slot.expectedItem || item.name === slot.expectedItem)
    );

  if (equipped.length === 0) {
    return {
      success: false,
      code: 'EQUIPMENT_NOT_EQUIPPED',
      data: { target }
    };
  }

  const removed = [];
  try {
    for (const { slot, item } of equipped) {
      console.log('[unequip:start]', {
        item: item.name,
        slot: slot.destination,
        inventorySlot: slot.inventorySlot
      });
      await bot.unequip(slot.destination);
      removed.push({ item: item.name, slot: slot.destination });
      console.log('[unequip:complete]', {
        item: item.name,
        slot: slot.destination
      });
    }
    return {
      success: true,
      code: 'EQUIPMENT_UNEQUIPPED',
      data: { target, items: removed, count: removed.length }
    };
  } catch (error) {
    console.error('[unequip] failed:', error.message);
    return {
      success: false,
      code: 'EQUIPMENT_UNEQUIP_FAILED',
      data: {
        target,
        items: removed,
        count: removed.length,
        error: error.message
      }
    };
  }
}

module.exports = {
  unequipArmor,
  resolveUnequipTargets,
  equippedItem
};
