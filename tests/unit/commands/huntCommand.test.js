const test = require('node:test');
const assert = require('node:assert/strict');
const huntCommand = require('../../../src/commands/huntCommand');

test('HUNT_INCOMPLETE 결과는 사냥 실패 채팅으로 변환한다', () => {
  assert.equal(huntCommand.huntFailureMessage({
    success: false,
    code: 'HUNT_INCOMPLETE',
    data: { acquired: 7, hunted: 1 }
  }), '사냥에 실패했어.');
  assert.equal(huntCommand.huntFailureMessage({
    success: false,
    code: 'HUNT_WATER_RECOVERY_FAILED',
    data: {}
  }), null);
});

test('지원하지 않는 사냥 자원은 공통 실패 형식으로 반환한다', async () => {
  const result = await huntCommand.execute({}, 'player', {
    action: 'huntCommand',
    target: 'wool',
    count: 2
  });
  assert.deepEqual(result, {
    success: false,
    code: 'UNSUPPORTED_HUNT_RESOURCE',
    data: { resource: 'wool' }
  });
});

test('hunt limit failures have a player-facing message', () => {
  assert.equal(
    huntCommand.huntFailureMessage({ code: 'HUNT_ATTEMPTS_EXHAUSTED' }),
    '사냥에 실패했어.'
  );
  assert.equal(
    huntCommand.huntFailureMessage({ code: 'HUNT_TARGET_RETRIES_EXHAUSTED' }),
    '사냥에 실패했어.'
  );
});

test('kill-based hunting reports the hunted count even when incomplete', () => {
  assert.equal(
    huntCommand.huntCountMessage('양', {
      success: false,
      code: 'HUNT_TARGET_RETRIES_EXHAUSTED',
      data: {
        countMode: 'until_empty',
        hunted: 1
      }
    }),
    '양 1마리 잡았어.'
  );
  assert.equal(
    huntCommand.huntCountMessage('닭', {
      success: true,
      code: 'HUNT_COMPLETED',
      data: {
        countMode: 'kills',
        hunted: 3
      }
    }),
    '닭 3마리 잡았어.'
  );
});
