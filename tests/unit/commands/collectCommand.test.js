const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateReturnReserve, shouldCollectReturnReserve } = require('../../../src/commands/collectCommand');

test('복귀 여유분은 플레이어와 봇의 Y 차이에 안전 여유를 더한다', () => {
  assert.equal(calculateReturnReserve({ y: 50.2 }, { y: 64 }, 2), 16);
  assert.equal(calculateReturnReserve({ y: 64 }, { y: 64 }, 2), 0);
  assert.equal(calculateReturnReserve({ y: 70 }, { y: 64 }, 2), 0);
});

test('복귀 여유분은 발판으로 사용할 수 있는 돌과 흙에만 적용한다', () => {
  assert.equal(shouldCollectReturnReserve('stone'), true);
  assert.equal(shouldCollectReturnReserve('dirt'), true);
  assert.equal(shouldCollectReturnReserve('coal'), false);
  assert.equal(shouldCollectReturnReserve('iron'), false);
});
