const test = require('node:test');
const assert = require('node:assert/strict');
const { approachPlayer } = require('../../../src/actions/approachPlayer');

test('approachPlayer는 플레이어 3칸 범위로 이동한 뒤 플레이어를 바라본다', async () => {
  let goal;
  let lookedAt;
  const player = {
    position: {
      x: 10,
      y: 64,
      z: 10,
      offset: (x, y, z) => ({ x: 10 + x, y: 64 + y, z: 10 + z })
    }
  };
  const bot = {
    players: { user: { entity: player } },
    pathfinder: { async goto(nextGoal) { goal = nextGoal; } },
    async lookAt(position) { lookedAt = position; }
  };

  assert.equal(await approachPlayer(bot, 'user', 3), true);
  assert.equal(goal.rangeSq, 9);
  assert.deepEqual(lookedAt, { x: 10, y: 65.6, z: 10 });
});

test('approachPlayer는 플레이어가 보이지 않으면 false를 반환한다', async () => {
  assert.equal(await approachPlayer({ players: {} }, 'user', 3), false);
});
