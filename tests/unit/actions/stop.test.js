const test = require('node:test');
const assert = require('node:assert/strict');
const { stopSign } = require('../../../src/actions/stop');
const { createBot } = require('../../helpers/createBot');

test('stopSign은 상태와 이동 및 채굴을 중지한다', async () => {
  let stopped = false; const bot = createBot({ stopDigging() { stopped = true; } });
  assert.equal(await stopSign(bot), true);
  assert.equal(bot.isBusy, false); assert.equal(bot.isStopped, true); assert.equal(bot.pathfinder.goal, null); assert.equal(stopped, true);
});
