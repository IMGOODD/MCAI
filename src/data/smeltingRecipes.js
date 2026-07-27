const COLORS = [
  'white', 'orange', 'magenta', 'light_blue',
  'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue',
  'brown', 'green', 'red', 'black'
];

const WOOD_TYPES = [
  'oak', 'spruce', 'birch', 'jungle',
  'acacia', 'dark_oak', 'mangrove', 'cherry'
];

const charcoalInputs = WOOD_TYPES.flatMap(type => [
  `${type}_log`,
  `stripped_${type}_log`,
  `${type}_wood`,
  `stripped_${type}_wood`
]).concat(['bamboo_block', 'stripped_bamboo_block']);

const glazedTerracottaRecipes = Object.fromEntries(
  COLORS.map(color => [`${color}_glazed_terracotta`, {
    input: `${color}_terracotta`,
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'decorative'
  }])
);

const smeltingRecipes = {
  // Minerals
  iron_ingot: {
    input: 'raw_iron',
    alternatives: ['iron_ore', 'deepslate_iron_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  gold_ingot: {
    input: 'raw_gold',
    alternatives: ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  copper_ingot: {
    input: 'raw_copper',
    alternatives: ['copper_ore', 'deepslate_copper_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  coal: {
    input: 'coal_ore',
    alternatives: ['deepslate_coal_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  redstone: {
    input: 'redstone_ore',
    alternatives: ['deepslate_redstone_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  lapis_lazuli: {
    input: 'lapis_ore',
    alternatives: ['deepslate_lapis_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  diamond: {
    input: 'diamond_ore',
    alternatives: ['deepslate_diamond_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  emerald: {
    input: 'emerald_ore',
    alternatives: ['deepslate_emerald_ore'],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  quartz: {
    input: 'nether_quartz_ore',
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },
  netherite_scrap: {
    input: 'ancient_debris',
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'mineral'
  },

  // Food
  cooked_porkchop: { input: 'porkchop', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_beef: { input: 'beef', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_chicken: { input: 'chicken', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_mutton: { input: 'mutton', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_rabbit: { input: 'rabbit', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_cod: { input: 'cod', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  cooked_salmon: { input: 'salmon', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  baked_potato: { input: 'potato', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  dried_kelp: { input: 'kelp', fuel: 'coal', itemsPerFuel: 8, category: 'food' },
  popped_chorus_fruit: { input: 'chorus_fruit', fuel: 'coal', itemsPerFuel: 8, category: 'food' },

  // Blocks and materials
  glass: { input: 'sand', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  stone: { input: 'cobblestone', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  smooth_stone: { input: 'stone', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  deepslate: { input: 'cobbled_deepslate', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  smooth_sandstone: { input: 'sandstone', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  smooth_red_sandstone: { input: 'red_sandstone', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  smooth_quartz: { input: 'quartz_block', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  smooth_basalt: { input: 'basalt', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  brick: { input: 'clay_ball', fuel: 'coal', itemsPerFuel: 8, category: 'material' },
  nether_brick: { input: 'netherrack', fuel: 'coal', itemsPerFuel: 8, category: 'material' },
  terracotta: { input: 'clay', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  cracked_stone_bricks: { input: 'stone_bricks', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  cracked_nether_bricks: { input: 'nether_bricks', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  cracked_polished_blackstone_bricks: {
    input: 'polished_blackstone_bricks', fuel: 'coal', itemsPerFuel: 8, category: 'block'
  },
  cracked_deepslate_bricks: {
    input: 'deepslate_bricks', fuel: 'coal', itemsPerFuel: 8, category: 'block'
  },
  cracked_deepslate_tiles: {
    input: 'deepslate_tiles', fuel: 'coal', itemsPerFuel: 8, category: 'block'
  },
  sponge: { input: 'wet_sponge', fuel: 'coal', itemsPerFuel: 8, category: 'block' },
  charcoal: {
    input: charcoalInputs[0],
    alternatives: charcoalInputs.slice(1),
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'fuel'
  },
  green_dye: { input: 'cactus', fuel: 'coal', itemsPerFuel: 8, category: 'dye' },
  lime_dye: { input: 'sea_pickle', fuel: 'coal', itemsPerFuel: 8, category: 'dye' },

  ...glazedTerracottaRecipes,

  // Recycling recipes are excluded from automatic crafting plans.
  iron_nugget: {
    input: 'iron_sword',
    alternatives: [
      'iron_shovel', 'iron_pickaxe', 'iron_axe', 'iron_hoe',
      'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots',
      'chainmail_helmet', 'chainmail_chestplate', 'chainmail_leggings', 'chainmail_boots'
    ],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'recycling',
    recyclingOnly: true
  },
  gold_nugget: {
    input: 'golden_sword',
    alternatives: [
      'golden_shovel', 'golden_pickaxe', 'golden_axe', 'golden_hoe',
      'golden_helmet', 'golden_chestplate', 'golden_leggings', 'golden_boots'
    ],
    fuel: 'coal',
    itemsPerFuel: 8,
    category: 'recycling',
    recyclingOnly: true
  }
};

module.exports = smeltingRecipes;
