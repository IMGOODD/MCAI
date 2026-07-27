const HUNTING_RESOURCES = {
  animals: {
    displayName: '동물',
    mobs: [
      'cow', 'pig', 'chicken', 'sheep', 'rabbit', 'goat', 'mooshroom',
      'horse', 'donkey', 'mule', 'llama', 'trader_llama', 'camel',
      'fox', 'wolf', 'cat', 'ocelot', 'panda', 'polar_bear',
      'turtle', 'frog', 'parrot', 'bee', 'sniffer'
    ],
    drops: [
      'beef', 'porkchop', 'chicken', 'mutton', 'leather', 'wool',
      'rabbit', 'rabbit_hide', 'rabbit_foot', 'feather'
    ]
  },
  meat: {
    displayName: '고기',
    mobs: ['cow', 'pig', 'chicken'],
    drops: ['beef', 'porkchop', 'chicken']
  },
  beef: {
    displayName: '소고기',
    mobs: ['cow'],
    drops: ['beef']
  },
  porkchop: {
    displayName: '돼지고기',
    mobs: ['pig'],
    drops: ['porkchop']
  },
  chicken: {
    displayName: '닭고기',
    mobs: ['chicken'],
    drops: ['chicken']
  },
  leather: {
    displayName: '가죽',
    mobs: ['cow'],
    drops: ['leather']
  }
};

const HUNT_TARGET_ALIASES = {
  animal: 'animals',
  all_animals: 'animals',
  raw_beef: 'beef',
  raw_porkchop: 'porkchop',
  raw_chicken: 'chicken',
  cow: 'beef',
  pig: 'porkchop'
};

const HUNTING_ANIMALS = {
  cow: { displayName: '소', resource: 'beef', drops: ['beef', 'leather'] },
  pig: { displayName: '돼지', resource: 'porkchop', drops: ['porkchop'] },
  chicken: { displayName: '닭', resource: 'chicken', drops: ['chicken', 'feather'] },
  sheep: { displayName: '양', drops: ['mutton', 'wool'] },
  rabbit: { displayName: '토끼', drops: ['rabbit', 'rabbit_hide', 'rabbit_foot'] },
  goat: { displayName: '염소', drops: [] },
  mooshroom: { displayName: '무시룸', drops: ['beef', 'leather'] },
  horse: { displayName: '말', drops: ['leather'] },
  donkey: { displayName: '당나귀', drops: ['leather'] },
  mule: { displayName: '노새', drops: ['leather'] },
  llama: { displayName: '라마', drops: ['leather'] },
  trader_llama: { displayName: '상인 라마', drops: ['leather'] },
  camel: { displayName: '낙타', drops: [] },
  fox: { displayName: '여우', drops: [] },
  wolf: { displayName: '늑대', drops: [] },
  cat: { displayName: '고양이', drops: [] },
  ocelot: { displayName: '오실롯', drops: [] },
  panda: { displayName: '판다', drops: [] },
  polar_bear: { displayName: '북극곰', drops: [] },
  turtle: { displayName: '거북', drops: [] },
  frog: { displayName: '개구리', drops: [] },
  parrot: { displayName: '앵무새', drops: [] },
  bee: { displayName: '벌', drops: [] },
  sniffer: { displayName: '스니퍼', drops: [] }
};

function normalizeHuntTarget(target) {
  const normalized = String(target || '').toLowerCase();
  return HUNT_TARGET_ALIASES[normalized] || normalized;
}

function getHuntingResource(target) {
  const rawTarget = String(target || '').toLowerCase();
  const animal = HUNTING_ANIMALS[rawTarget];
  if (animal) {
    return {
      displayName: animal.displayName,
      mobs: [rawTarget],
      drops: animal.drops || []
    };
  }
  return HUNTING_RESOURCES[normalizeHuntTarget(rawTarget)] || null;
}

function getHuntingAnimal(target) {
  return HUNTING_ANIMALS[String(target || '').toLowerCase()] || null;
}

module.exports = {
  HUNTING_RESOURCES,
  HUNT_TARGET_ALIASES,
  HUNTING_ANIMALS,
  normalizeHuntTarget,
  getHuntingResource,
  getHuntingAnimal
};
