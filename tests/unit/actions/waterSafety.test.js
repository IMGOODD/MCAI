const test = require('node:test');
const assert = require('node:assert/strict');
const { isWaterBlock, isUnsafeWaterTarget } = require('../../../src/actions/collect');
const { createBot } = require('../../helpers/createBot');

test('물과 물에 잠긴 목표 블록은 채집 대상에서 제외한다', () => {
  const position = { offset: (x, y, z) => ({ x, y, z }) };
  const target = { name: 'stone', type: 1, position };
  const bot = createBot({ blockAt: () => ({ name: 'water' }) });

  assert.equal(isWaterBlock({ name: 'water' }), true);
  assert.equal(isWaterBlock({ name: 'stone' }), false);
  assert.equal(isUnsafeWaterTarget(bot, target), true);
});
