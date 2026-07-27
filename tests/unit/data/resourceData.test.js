const test = require('node:test');
const assert = require('node:assert/strict');
const resourceData = require('../../../src/data/resourceData');

test('자원 판별 함수는 지원하는 블록과 드롭 아이템을 식별한다', () => {
  assert.equal(resourceData.log.blockMatcher('oak_log'), true);
  assert.equal(resourceData.stone.tossMatcher('cobblestone'), true);
  assert.equal(resourceData.coal.blockMatcher('deepslate_coal_ore'), true);
  assert.equal(resourceData.coal.tossMatcher('coal'), true);
  assert.equal(resourceData.iron.blockMatcher('iron_ore'), true);
  assert.equal(resourceData.iron.tossMatcher('raw_iron'), true);
  assert.equal(resourceData.dirt.tossMatcher('sand'), false);
});
