const materialPriority = [
  'leather',
  'golden',
  'chainmail',
  'iron',
  'diamond',
  'netherite'
];

const slots = {
  helmet: {
    destination: 'head',
    inventorySlot: 5
  },
  chestplate: {
    destination: 'torso',
    inventorySlot: 6
  },
  leggings: {
    destination: 'legs',
    inventorySlot: 7
  },
  boots: {
    destination: 'feet',
    inventorySlot: 8
  }
};

const equipmentByItem = {};
const sets = {};

for (const material of materialPriority) {
  sets[material] = [];
  for (const [piece, slot] of Object.entries(slots)) {
    const itemName = `${material}_${piece}`;
    equipmentByItem[itemName] = {
      itemName,
      material,
      piece,
      rank: materialPriority.indexOf(material),
      ...slot
    };
    sets[material].push(itemName);
  }
}

module.exports = {
  materialPriority,
  slots,
  equipmentByItem,
  sets
};
