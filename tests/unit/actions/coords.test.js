const test = require('node:test');
const assert = require('node:assert/strict');
const { coordsPrint } = require('../../../src/actions/coords');
const { createBot } = require('../../helpers/createBot');

test('coordsPrint는 좌표를 내림 처리해 채팅으로 보낸다', async () => {
  const bot = createBot();
  assert.equal(await coordsPrint(bot), true);
  assert.match(bot.chatMessages[0], /X: 1, Y: 64, Z: -4/);
});
