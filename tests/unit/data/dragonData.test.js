const test = require('node:test');
const assert = require('node:assert/strict');
const { DRAGON_CONFIG, REQUIRED_ITEMS } = require('../../../src/data/dragonData');

test('드래곤 공략의 안전 기준과 필수 장비를 데이터로 관리한다', () => {
  assert.equal(DRAGON_CONFIG.crystalSearchRange, 160);
  assert.ok(DRAGON_CONFIG.minFightHealth > 0);
  assert.ok(REQUIRED_ITEMS.sword.includes('iron_sword'));
  assert.ok(REQUIRED_ITEMS.bow.includes('bow'));
  assert.ok(REQUIRED_ITEMS.arrows.includes('arrow'));
});
