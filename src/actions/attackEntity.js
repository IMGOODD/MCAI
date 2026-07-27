const { performBoundedAttack } = require('./combat');

const MONSTER_TYPES = [
  'zombie', 'skeleton', 'spider', 'creeper',
  'enderman', 'witch', 'drowned', 'zombie_villager'
];
const ANIMAL_TYPES = [
  'cow', 'sheep', 'pig', 'chicken',
  'rabbit', 'horse', 'donkey', 'mule', 'llama'
];

function findNearestEntity(bot, types, maxDistance = 16) {
  return bot.nearestEntity(entity =>
    types.includes(entity.name) &&
    entity.isValid !== false &&
    bot.entity.position.distanceTo(entity.position) < maxDistance
  );
}

async function attackNearest(bot, types, maxDistance) {
  const target = findNearestEntity(bot, types, maxDistance);
  if (!target) return false;
  const result = await performBoundedAttack(bot, target, {
    maxChaseDistance: maxDistance,
    maxChaseMs: 8000,
    minHealth: 8
  });
  return result.success;
}

async function attackMonster(bot, maxDistance = 16) {
  const result = await attackNearest(bot, MONSTER_TYPES, maxDistance);
  if (!result) console.log('[attackMonster] 주변에 공격 가능한 몬스터가 없습니다.');
  return result;
}

async function attackAnimal(bot, maxDistance = 16) {
  const result = await attackNearest(bot, ANIMAL_TYPES, maxDistance);
  if (!result) console.log('[attackAnimal] 주변에 공격 가능한 동물이 없습니다.');
  return result;
}

module.exports = {
  MONSTER_TYPES,
  ANIMAL_TYPES,
  findNearestEntity,
  attackMonster,
  attackAnimal
};
