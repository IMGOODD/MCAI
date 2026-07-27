const HOSTILE_MOBS = new Set([
  // Overworld
  'zombie',
  'zombie_villager',
  'husk',
  'drowned',
  'skeleton',
  'stray',
  'bogged',
  'creeper',
  'witch',
  'cave_spider',
  'silverfish',
  'endermite',
  'slime',
  'phantom',
  'pillager',
  'vindicator',
  'evoker',
  'vex',
  'ravager',
  'guardian',
  'elder_guardian',

  // Nether
  'blaze',
  'ghast',
  'magma_cube',
  'wither_skeleton',
  'hoglin',
  'zoglin'
]);

const EXCLUDED_NEUTRAL_MOBS = new Set([
  'enderman',
  'piglin',
  'piglin_brute',
  'zombified_piglin',
  'zombie_pigman',
  'spider'
]);

const UNSAFE_MELEE_MOBS = new Set([
  'creeper',
  'ghast',
  'blaze',
  'phantom',
  'guardian',
  'elder_guardian'
]);

const DISPLAY_NAMES = {
  zombie: '좀비',
  zombie_villager: '좀비 주민',
  husk: '허스크',
  drowned: '드라운드',
  skeleton: '스켈레톤',
  stray: '스트레이',
  bogged: '보그드',
  creeper: '크리퍼',
  witch: '마녀',
  cave_spider: '동굴 거미',
  silverfish: '좀벌레',
  endermite: '엔더마이트',
  slime: '슬라임',
  phantom: '팬텀',
  pillager: '약탈자',
  vindicator: '변명자',
  evoker: '소환사',
  vex: '벡스',
  ravager: '파괴수',
  guardian: '가디언',
  elder_guardian: '엘더 가디언',
  blaze: '블레이즈',
  ghast: '가스트',
  magma_cube: '마그마 큐브',
  wither_skeleton: '위더 스켈레톤',
  hoglin: '호글린',
  zoglin: '조글린'
};

const defense = {
  detectionRange: 8,
  attackRange: 3,
  maxChaseDistance: 16,
  maxChaseMs: 10000,
  minFightHealth: 10,
  maxSimultaneousThreats: 2,
  retreatDistance: 10
};

const guard = {
  detectionRange: 64,
  attackRange: 3,
  maxChaseDistance: 64,
  maxChaseMs: 30000,
  minFightHealth: 10,
  maxSimultaneousThreats: 3,
  retreatDistance: 12,
  scanIntervalTicks: 10
};

module.exports = {
  HOSTILE_MOBS,
  EXCLUDED_NEUTRAL_MOBS,
  UNSAFE_MELEE_MOBS,
  DISPLAY_NAMES,
  defense,
  guard,
  zombie: {
    ...defense,
    detectionRange: 6,
    maxChaseDistance: 10,
    maxChaseMs: 7000,
    maxSimultaneousThreats: 1,
    retreatDistance: 8
  }
};
