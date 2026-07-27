const test = require('node:test');
const assert = require('node:assert/strict');
const {
  materialShortageMessage,
  shortageMessagesFromData
} = require('../../../src/utils/smeltingFeedback');

test('제련 재료 이름을 플레이어용 부족 메시지로 변환한다', () => {
  assert.equal(materialShortageMessage('coal'), '석탄이 부족해.');
  assert.equal(materialShortageMessage('raw_iron'), '철 광석이 부족해.');
  assert.equal(materialShortageMessage('cobblestone'), null);
});

test('제련 실패 데이터에서 실제로 부족한 재료만 메시지로 만든다', () => {
  assert.deepEqual(shortageMessagesFromData({
    input: { name: 'raw_iron', required: 3, available: 3 },
    fuel: { name: 'coal', required: 1, available: 0 }
  }), ['석탄이 부족해.']);

  assert.deepEqual(shortageMessagesFromData({
    input: { name: 'raw_iron', required: 3, available: 0 },
    fuel: { name: 'coal', required: 1, available: 0 }
  }), ['철 광석이 부족해.', '석탄이 부족해.']);
});
