const equipmentData = require('../data/equipmentData');

function findEquipment(bot, itemName) {
  return bot.inventory.items().find(item => item.name === itemName) || null;
}

async function equipArmor(bot, itemName) {
  const equipment = equipmentData.equipmentByItem[itemName];
  if (!equipment) {
    console.warn('[equip] unsupported equipment:', itemName);
    return {
      success: false,
      code: 'EQUIPMENT_UNSUPPORTED',
      data: { item: itemName }
    };
  }

  const item = findEquipment(bot, itemName);
  if (!item) {
    console.warn('[equip] item unavailable:', itemName);
    return {
      success: false,
      code: 'EQUIPMENT_MISSING',
      data: { item: itemName, slot: equipment.destination }
    };
  }

  try {
    console.log('[equip:start]', {
      item: itemName,
      slot: equipment.destination,
      inventorySlot: item.slot
    });
    await bot.equip(item, equipment.destination);
    console.log('[equip:complete]', {
      item: itemName,
      slot: equipment.destination
    });
    return {
      success: true,
      code: 'EQUIPMENT_EQUIPPED',
      data: { item: itemName, slot: equipment.destination }
    };
  } catch (error) {
    console.error('[equip] failed:', error.message);
    return {
      success: false,
      code: 'EQUIPMENT_EQUIP_FAILED',
      data: { item: itemName, slot: equipment.destination, error: error.message }
    };
  }
}

module.exports = {
  equipArmor,
  findEquipment
};
