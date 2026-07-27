const test = require('node:test');
const assert = require('node:assert/strict');
const { attackAnimal, attackMonster } = require('../../../src/actions/attackEntity');
const { createBot } = require('../../helpers/createBot');

test('공격 함수는 유효한 대상이 없으면 false를 반환한다', async () => {
  const bot = createBot();
  assert.equal(await attackAnimal(bot), false);
  assert.equal(await attackMonster(bot), false);
});
