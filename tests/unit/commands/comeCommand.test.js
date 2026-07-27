const test = require('node:test');
const assert = require('node:assert/strict');
const comeCommand = require('../../../src/commands/comeCommand');
const { createBot } = require('../../helpers/createBot');

test('comeCommand는 플레이어와 좌표가 모두 없을 때 표준 실패 결과를 반환한다', async () => {
  const result = await comeCommand.execute(createBot(), 'missingPlayer', { action: 'comeCommand' });

  assert.deepEqual(result, {
    success: false,
    code: 'MOVE_TARGET_UNAVAILABLE',
    data: { username: 'missingPlayer', target: null }
  });
});

test('comeCommand는 좌표가 있으면 좌표 이동 시작 결과를 반환한다', async () => {
  const bot = createBot();
  const result = await comeCommand.execute(bot, 'farPlayer', {
    action: 'comeCommand',
    target: '100,64,-200'
  });

  assert.deepEqual(result, {
    success: true,
    code: 'MOVEMENT_STARTED',
    data: {
      mode: 'coordinates',
      username: 'farPlayer',
      target: { x: 100, y: 64, z: -200 }
    }
  });
  assert.equal(bot.pathfinder.goal.x, 100);
  assert.equal(bot.pathfinder.goal.z, -200);
});
