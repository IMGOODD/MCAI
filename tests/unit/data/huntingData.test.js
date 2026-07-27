const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getHuntingResource,
  normalizeHuntTarget
} = require('../../../src/data/huntingData');

test('고기 종류를 사냥 대상 동물과 실제 드롭 아이템으로 변환한다', () => {
  assert.deepEqual(getHuntingResource('beef').mobs, ['cow']);
  assert.deepEqual(getHuntingResource('porkchop').drops, ['porkchop']);
  assert.deepEqual(getHuntingResource('meat').mobs, ['cow', 'pig', 'chicken']);
});

test('raw 고기와 동물 이름 별칭을 내부 사냥 대상으로 정규화한다', () => {
  assert.equal(normalizeHuntTarget('raw_beef'), 'beef');
  assert.equal(normalizeHuntTarget('pig'), 'porkchop');
});

test('전체 동물 사냥은 기존 가축 외의 일반 동물도 포함한다', () => {
  const animals = getHuntingResource('animals');
  assert.equal(animals.mobs.includes('sheep'), true);
  assert.equal(animals.mobs.includes('rabbit'), true);
  assert.equal(animals.mobs.includes('horse'), true);
  assert.equal(animals.mobs.includes('bat'), false);
  assert.deepEqual(getHuntingResource('sheep').mobs, ['sheep']);
  assert.equal(getHuntingResource('bat'), null);
});
