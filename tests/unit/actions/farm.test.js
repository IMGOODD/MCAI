const test = require('node:test');
const assert = require('node:assert/strict');
const { autoFarm } = require('../../../src/actions/farm');
const { createBot } = require('../../helpers/createBot');

test('autoFarm은 주변에 다 자란 밀이 없으면 false를 반환한다', async () => {
  assert.equal(await autoFarm(createBot()), false);
});
