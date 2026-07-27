const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findHostileThreats,
  decideHostileResponse,
  escapeHostileThreat,
  fleeToCommander,
  findZombieThreats,
  decideZombieResponse
} = require('../../../src/core/combatManager');

function point(x) {
  return { x, y: 64, z: 0 };
}

function botWith(entities, items = [{ name: 'stone_sword', count: 1 }], health = 20) {
  return {
    health,
    entity: { position: point(0), isInWater: false },
    entities: Object.fromEntries(entities.map(entity => [entity.id, entity])),
    inventory: { items: () => items },
    blockAt: () => ({ name: 'stone' })
  };
}

test('기초 방어는 좀비만 감지하고 가까운 순서로 정렬한다', () => {
  const bot = botWith([
    { id: 1, name: 'cow', isValid: true, position: point(1) },
    { id: 2, name: 'zombie', isValid: true, position: point(5) },
    { id: 3, name: 'zombie', isValid: true, position: point(3) }
  ]);
  assert.deepEqual(findZombieThreats(bot).map(entity => entity.id), [3, 2]);
});

test('hostile mobs are detected while conditional neutral mobs are excluded', () => {
  const bot = botWith([
    { id: 1, name: 'skeleton', isValid: true, position: point(2) },
    { id: 2, name: 'blaze', isValid: true, position: point(3) },
    { id: 3, name: 'enderman', isValid: true, position: point(1) },
    { id: 4, name: 'piglin', isValid: true, position: point(1) },
    { id: 5, name: 'spider', isValid: true, position: point(1) }
  ]);
  assert.deepEqual(findHostileThreats(bot, 64).map(entity => entity.name), [
    'skeleton',
    'blaze'
  ]);
});

test('unsafe melee mobs cause a retreat decision', () => {
  const creeper = { id: 1, name: 'creeper', isValid: true, position: point(3) };
  const response = decideHostileResponse(botWith([creeper]), [creeper], {
    minFightHealth: 10,
    maxSimultaneousThreats: 3
  });
  assert.equal(response.type, 'retreat');
  assert.equal(response.reason, 'UNSAFE_MELEE_TARGET');
});

test('전투할 수 없으면 최근 명령자에게 후퇴한다', async () => {
  const goals = [];
  const player = { position: point(10) };
  const bot = {
    lastCommanderUsername: 'player',
    entity: { position: point(0) },
    players: { player: { entity: player } },
    pathfinder: {
      setGoal(goal) { goals.push(goal); }
    },
    async waitForTicks() {
      bot.entity.position = point(8);
    },
    chat() {}
  };

  assert.equal(await fleeToCommander(bot, 'player', {
    commanderRange: 3,
    commanderTimeoutTicks: 4
  }), true);
  assert.ok(goals[0]);
  assert.equal(goals.at(-1), null);
});

test('후퇴할 때 위협 좌표를 알리고 명령자에게 이동한다', async () => {
  const chats = [];
  const zombie = { name: 'zombie', position: point(4) };
  const bot = {
    lastCommanderUsername: 'player',
    entity: { position: point(0) },
    players: { player: { entity: { position: point(2) } } },
    pathfinder: { setGoal() {} },
    chat(message) { chats.push(message); }
  };
  const result = await escapeHostileThreat(
    bot,
    { target: zombie, reason: 'NO_SWORD' },
    { retreatDistance: 8 },
    { commanderTimeoutTicks: 2 }
  );

  assert.equal(result.code, 'DEFENSE_FLED_TO_COMMANDER');
  assert.match(chats[0], /4 64 0/);
  assert.match(chats[0], /네 쪽으로 갈게/);
});

test('좀비 한 마리와 검 및 체력이 있으면 맞서 싸운다', () => {
  const zombie = { id: 1, name: 'zombie', isValid: true, position: point(3) };
  const bot = botWith([zombie]);
  assert.equal(decideZombieResponse(bot, [zombie]).type, 'fight');
});

test('좀비가 여러 마리거나 체력 또는 검이 부족하면 후퇴한다', () => {
  const zombies = [
    { id: 1, name: 'zombie', isValid: true, position: point(3) },
    { id: 2, name: 'zombie', isValid: true, position: point(4) }
  ];
  assert.equal(decideZombieResponse(botWith(zombies), zombies).reason, 'MULTIPLE_THREATS');
  assert.equal(decideZombieResponse(botWith([zombies[0]], [], 6), [zombies[0]]).reason, 'LOW_HEALTH');
  assert.equal(decideZombieResponse(botWith([zombies[0]], []), [zombies[0]]).reason, 'NO_SWORD');
});
