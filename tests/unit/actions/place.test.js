const test = require('node:test');
const assert = require('node:assert/strict');
const { placing } = require('../../../src/actions/place');
const { createBot } = require('../../helpers/createBot');

test('placing은 요청한 블록이 없으면 false를 반환한다', async () => {
  assert.equal(await placing(createBot(), 'crafting_table'), false);
});
