const test = require('node:test');
const assert = require('node:assert/strict');
const {
  comeToMe,
  comeToCoordinates,
  parseCoordinates
} = require('../../../src/actions/come');
const { createBot } = require('../../helpers/createBot');
const { EventEmitter } = require('node:events');

test('comeToMe는 플레이어 엔티티가 없으면 false를 반환한다', async () => {
  assert.equal(await comeToMe(createBot(), 'missingPlayer'), false);
});

test('parseCoordinates는 문자열, 배열, 객체 좌표를 해석한다', () => {
  assert.deepEqual(parseCoordinates('100,64,-200'), { x: 100, y: 64, z: -200 });
  assert.deepEqual(parseCoordinates(['100', '64', '-200']), { x: 100, y: 64, z: -200 });
  assert.deepEqual(parseCoordinates({ x: 100, y: 64, z: -200 }), { x: 100, y: 64, z: -200 });
  assert.equal(parseCoordinates('100,64'), null);
});

test('comeToCoordinates는 기존 이동 설정을 유지하고 좌표 반경 목표를 설정한다', async () => {
  const movements = { liquidCost: 100 };
  let assignedGoal;
  let dynamic;
  const bot = createBot({
    pathfinder: {
      movements,
      setGoal(goal, isDynamic) {
        assignedGoal = goal;
        dynamic = isDynamic;
      },
      setMovements() {
        throw new Error('기존 이동 설정을 덮어쓰면 안 됩니다.');
      }
    }
  });

  assert.equal(await comeToCoordinates(bot, '100 64 -200'), true);
  assert.equal(assignedGoal.x, 100);
  assert.equal(assignedGoal.y, 64);
  assert.equal(assignedGoal.z, -200);
  assert.equal(assignedGoal.rangeSq, 9);
  assert.equal(dynamic, false);
  assert.equal(bot.pathfinder.movements, movements);
});

test('come movement temporarily allows water and restores avoidance on arrival', async () => {
  const bot = new EventEmitter();
  const movements = {
    liquidCost: 100,
    blocksToAvoid: new Set([1, 2, 3])
  };
  const player = { position: { x: 20, y: 64, z: 0 } };
  Object.assign(bot, {
    chat() {},
    players: { player: { entity: player } },
    registry: {
      blocksByName: {
        water: { id: 1 },
        flowing_water: { id: 2 },
        bubble_column: { id: 3 }
      }
    },
    pathfinder: {
      movements,
      setGoal(goal) {
        this.goal = goal;
      }
    }
  });

  assert.equal(await comeToMe(bot, 'player'), true);
  assert.equal(movements.liquidCost, 8);
  assert.deepEqual([...movements.blocksToAvoid], []);

  bot.emit('goal_reached');
  assert.equal(movements.liquidCost, 100);
  assert.deepEqual([...movements.blocksToAvoid].sort(), [1, 2, 3]);
});
