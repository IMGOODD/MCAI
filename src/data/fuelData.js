const WOOD_TYPES = [
  'oak', 'spruce', 'birch', 'jungle', 'acacia',
  'dark_oak', 'mangrove', 'cherry', 'pale_oak'
];
const COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
  'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'
];

const fuels = {
  // Prefer fuels that are safe to consume automatically.
  coal: { itemsPerFuel: 8, category: 'mineral' },
  charcoal: { itemsPerFuel: 8, category: 'mineral' },
  coal_block: { itemsPerFuel: 80, category: 'mineral' },
  dried_kelp_block: { itemsPerFuel: 20, category: 'plant' },
  blaze_rod: { itemsPerFuel: 12, category: 'mob_drop' },
  lava_bucket: { itemsPerFuel: 100, category: 'container', returnItem: 'bucket' },

  // Low-cost fallback fuels.
  bamboo: { itemsPerFuel: 0.25, category: 'plant' },
  scaffolding: { itemsPerFuel: 0.25, category: 'plant' },
  stick: { itemsPerFuel: 0.5, category: 'wood' },
  bowl: { itemsPerFuel: 0.5, category: 'wood' },
  dead_bush: { itemsPerFuel: 0.5, category: 'plant' },
  azalea: { itemsPerFuel: 0.5, category: 'plant' },
  flowering_azalea: { itemsPerFuel: 0.5, category: 'plant' },

  // Crafted blocks and tools are last-resort fuels.
  chest: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  trapped_chest: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  barrel: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  crafting_table: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  bookshelf: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  lectern: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  composter: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  loom: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  cartography_table: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  fletching_table: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  smithing_table: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  note_block: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  jukebox: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  ladder: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  bow: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  fishing_rod: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  crossbow: { itemsPerFuel: 1.5, category: 'crafted_wood' },
  wooden_sword: { itemsPerFuel: 1, category: 'wooden_tool' },
  wooden_shovel: { itemsPerFuel: 1, category: 'wooden_tool' },
  wooden_pickaxe: { itemsPerFuel: 1, category: 'wooden_tool' },
  wooden_axe: { itemsPerFuel: 1, category: 'wooden_tool' },
  wooden_hoe: { itemsPerFuel: 1, category: 'wooden_tool' }
};

for (const type of WOOD_TYPES) {
  for (const name of [
    `${type}_log`, `stripped_${type}_log`, `${type}_wood`, `stripped_${type}_wood`,
    `${type}_planks`, `${type}_stairs`, `${type}_fence`, `${type}_fence_gate`,
    `${type}_trapdoor`, `${type}_pressure_plate`
  ]) fuels[name] = { itemsPerFuel: 1.5, category: 'wood' };

  fuels[`${type}_slab`] = { itemsPerFuel: 0.75, category: 'wood' };
  fuels[`${type}_door`] = { itemsPerFuel: 1, category: 'wood' };
  fuels[`${type}_sign`] = { itemsPerFuel: 1, category: 'wood' };
  fuels[`${type}_hanging_sign`] = { itemsPerFuel: 4, category: 'wood' };
  fuels[`${type}_button`] = { itemsPerFuel: 0.5, category: 'wood' };
  fuels[`${type}_sapling`] = { itemsPerFuel: 0.5, category: 'plant' };
  fuels[`${type}_boat`] = { itemsPerFuel: 6, category: 'wood' };
  fuels[`${type}_chest_boat`] = { itemsPerFuel: 6, category: 'wood' };
}

for (const name of [
  'bamboo_block', 'stripped_bamboo_block', 'bamboo_planks', 'bamboo_mosaic',
  'bamboo_stairs', 'bamboo_mosaic_stairs', 'bamboo_fence', 'bamboo_fence_gate',
  'bamboo_trapdoor', 'bamboo_pressure_plate'
]) fuels[name] = { itemsPerFuel: 1.5, category: 'bamboo_wood' };
fuels.bamboo_slab = { itemsPerFuel: 0.75, category: 'bamboo_wood' };
fuels.bamboo_mosaic_slab = { itemsPerFuel: 0.75, category: 'bamboo_wood' };
fuels.bamboo_door = { itemsPerFuel: 1, category: 'bamboo_wood' };
fuels.bamboo_sign = { itemsPerFuel: 1, category: 'bamboo_wood' };
fuels.bamboo_hanging_sign = { itemsPerFuel: 4, category: 'bamboo_wood' };
fuels.bamboo_button = { itemsPerFuel: 0.5, category: 'bamboo_wood' };
fuels.bamboo_raft = { itemsPerFuel: 6, category: 'bamboo_wood' };
fuels.bamboo_chest_raft = { itemsPerFuel: 6, category: 'bamboo_wood' };

for (const color of COLORS) {
  fuels[`${color}_wool`] = { itemsPerFuel: 0.5, category: 'wool' };
  fuels[`${color}_carpet`] = { itemsPerFuel: 1 / 3, category: 'wool' };
}

module.exports = {
  fuels,
  defaultFuel: 'coal',
  // Minecraft uses lava buckets as fuel, not magma blocks.
  aliases: { magma: 'lava_bucket', lava: 'lava_bucket' },
  nonFuels: ['magma_block']
};
