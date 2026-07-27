const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findBoatItem,
  findBoatPlacementWater,
  travelByBoat
} = require('../../../src/actions/boatTravel');

function point(x, y = 63, z = 0) {
  return {
    x, y, z,
    floored() { return point(Math.floor(x), Math.floor(y), Math.floor(z)); },
    offset(dx, dy, dz) { return point(x + dx, y + dy, z + dz); }
  };
}

test('보유한 일반 보트를 찾고 주변 물을 설치 위치로 선택한다', () => {
  const water = { name: 'water', position: point(1) };
  const bot = {
    inventory: {
      items: () => [
        { name: 'bread', count: 1 },
        { name: 'oak_boat', count: 1 }
      ]
    },
    findBlock(options) {
      return options.matching(water) ? water : null;
    }
  };
  assert.equal(findBoatItem(bot).name, 'oak_boat');
  assert.equal(findBoatPlacementWater(bot), water);
});

test('보트를 설치해 목표 방향으로 이동한 뒤 하차하고 회수한다', async () => {
  const water = { name: 'water', position: point(0) };
  const boat = { name: 'boat', isValid: true, position: point(0) };
  let recovered = false;
  let dismounted = false;
  const bot = {
    isStopped: false,
    entity: { position: point(0), isInWater: true },
    inventory: { items: () => [{ name: 'oak_boat', count: 1 }] },
    pathfinder: { setGoal() {} },
    findBlock: () => water,
    blockAt: () => ({ name: 'water' }),
    async equip() {},
    async placeEntity() { return boat; },
    mount(entity) { bot.vehicle = entity; },
    dismount() {
      dismounted = true;
      bot.vehicle = null;
    },
    moveVehicle() {},
    async lookAt() {},
    async waitForTicks() {
      boat.position = point(9);
    }
  };

  const result = await travelByBoat(bot, () => point(10), {
    range: 2,
    recoverBoat: async () => {
      recovered = true;
      return true;
    }
  });
  assert.equal(result.code, 'BOAT_TRAVEL_COMPLETED');
  assert.equal(dismounted, true);
  assert.equal(recovered, true);
  assert.equal(result.data.recovered, true);
});
