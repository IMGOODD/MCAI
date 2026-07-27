const test = require('node:test');
const assert = require('node:assert/strict');
const equipmentData = require('../../../src/data/equipmentData');

test('방어구 우선순위와 장착 슬롯을 네더라이트까지 제공한다', () => {
  assert.deepEqual(equipmentData.materialPriority, [
    'leather',
    'golden',
    'chainmail',
    'iron',
    'diamond',
    'netherite'
  ]);
  assert.equal(Object.keys(equipmentData.equipmentByItem).length, 24);
  assert.deepEqual(equipmentData.sets.netherite, [
    'netherite_helmet',
    'netherite_chestplate',
    'netherite_leggings',
    'netherite_boots'
  ]);
  assert.equal(equipmentData.equipmentByItem.iron_chestplate.destination, 'torso');
  assert.equal(equipmentData.equipmentByItem.netherite_boots.destination, 'feet');
});
