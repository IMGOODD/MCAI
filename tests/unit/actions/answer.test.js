const test = require('node:test');
const assert = require('node:assert/strict');
const { answer } = require('../../../src/actions/answer');
const { createBot } = require('../../helpers/createBot');

test('answer는 인벤토리 내용을 채팅으로 알려준다', async () => {
  const bot = createBot({ inventory: { items: () => [{ displayName: 'Stone', name: 'stone', count: 3 }] } });
  assert.equal(await answer(bot), true);
  assert.match(bot.chatMessages[0], /Stone x3/);
});
