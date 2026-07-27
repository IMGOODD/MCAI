const test = require('node:test');
const assert = require('node:assert/strict');
const { guardArea } = require('../../../src/actions/guardArea');

function point(x, y = 64, z = 0) {
  return {
    x, y, z,
    clone() { return point(this.x, this.y, this.z); }
  };
}

function createBot() {
  const chats = [];
  return {
    health: 20,
    food: 20,
    isStopped: false,
    entity: { position: point(0) },
    inventory: { items: () => [{ name: 'iron_sword', count: 1 }] },
    players: {},
    pathfinder: { setGoal() {} },
    waitForTicks: async () => {},
    chat(message) { chats.push(message); },
    chats
  };
}

test('싸울 수 없는 위협은 좌표와 함께 도움을 요청하고 명령자에게 후퇴한다', async () => {
  const bot = createBot();
  const creeper = { id: 1, name: 'creeper', position: point(12, 65, -4) };
  let fled = false;
  const result = await guardArea(bot, 'player', {
    maxCycles: 1,
    findThreats: () => [creeper],
    decideResponse: () => ({
      type: 'retreat',
      reason: 'UNSAFE_MELEE_TARGET',
      target: creeper
    }),
    flee: async () => {
      fled = true;
      return true;
    }
  });

  assert.equal(result.code, 'GUARD_HELP_REQUESTED');
  assert.equal(fled, true);
  assert.match(bot.chats[0], /12 65 -4/);
  assert.match(bot.chats[0], /도와줘/);
});

test('사수 중 적대 몹을 처리한 뒤 다음 탐색을 계속한다', async () => {
  const bot = createBot();
  const zombie = { id: 1, name: 'zombie', position: point(4) };
  let scans = 0;
  const result = await guardArea(bot, 'player', {
    maxCycles: 2,
    findThreats: () => (++scans === 1 ? [zombie] : []),
    decideResponse: () => ({
      type: 'fight',
      reason: 'SAFE_TO_ENGAGE',
      target: zombie
    }),
    handleThreat: async () => ({
      success: true,
      code: 'HOSTILE_DEFENDED',
      data: {}
    })
  });

  assert.equal(result.code, 'GUARD_SCAN_LIMIT');
  assert.equal(result.data.defeated, 1);
  assert.equal(scans, 2);
});
