const DRAGON_CONFIG = {
  crystalSearchRange: 160,
  maxFightMs: 10 * 60 * 1000,
  minStartHealth: 16,
  minFightHealth: 10,
  minFood: 12,
  meleeRange: 4,
  perchHeight: 78,
  breathAvoidRange: 8,
  scanTicks: 10,
  bowChargeTicks: 20,
  maxCrystalAttempts: 3
};

const REQUIRED_ITEMS = {
  sword: ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword'],
  bow: ['bow'],
  arrows: ['arrow', 'spectral_arrow', 'tipped_arrow'],
  food: [
    'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
    'golden_carrot', 'bread', 'baked_potato', 'golden_apple'
  ]
};

module.exports = { DRAGON_CONFIG, REQUIRED_ITEMS };
