const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findEndCrystals,
  isCagedCrystal,
  readiness,
  isDragonPerched
} = require('../../../src/actions/dragonFight');

function position(x, y, z) {
  return {
    x, y, z,
    distanceTo(other) {
      return Math.hypot(x - other.x, y - other.y, z - other.z);
    },
    floored() { return position(Math.floor(x), Math.floor(y), Math.floor(z)); },
    offset(dx, dy, dz) { return position(x + dx, y + dy, z + dz); }
  };
}

test('엔더 수정은 가까운 순서로 탐색한다', () => {
  const bot = {
    entity: { position: position(0, 64, 0) },
    entities: {
      1: { name: 'end_crystal', isValid: true, position: position(20, 70, 0) },
      2: { name: 'end_crystal', isValid: true, position: position(5, 70, 0) },
      3: { name: 'zombie', isValid: true, position: position(1, 64, 0) }
    }
  };
  assert.deepEqual(findEndCrystals(bot).map(entity => entity.position.x), [5, 20]);
});

test('수정 주변 철창을 감지하고 장비 준비 상태를 계산한다', () => {
  const crystal = { position: position(0, 70, 0) };
  const bot = {
    blockAt(pos) {
      return { name: pos.x === 1 && pos.y === 70 ? 'iron_bars' : 'air' };
    },
    inventory: {
      items: () => ['diamond_sword', 'bow', 'arrow', 'bread']
        .map(name => ({ name, count: 1 }))
    },
    health: 20,
    food: 20
  };
  assert.equal(isCagedCrystal(bot, crystal), true);
  assert.equal(readiness(bot).bow, true);
  assert.equal(readiness(bot).food, true);
});

test('낮게 정지한 드래곤만 착지 상태로 판단한다', () => {
  assert.equal(isDragonPerched({
    position: position(0, 70, 0),
    velocity: { x: 0.01, y: 0, z: 0.01 }
  }), true);
  assert.equal(isDragonPerched({
    position: position(0, 100, 0),
    velocity: { x: 0, y: 0, z: 0 }
  }), false);
});
