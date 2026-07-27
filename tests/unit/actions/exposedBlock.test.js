const test = require('node:test');
const assert = require('node:assert/strict');
const { isExposedBlock } = require('../../../src/actions/collect');

function vec(x = 0, y = 0, z = 0) {
  return { x, y, z, offset(dx, dy, dz) { return vec(x + dx, y + dy, z + dz); } };
}

test('채집 대상은 공기와 맞닿아 실제로 노출된 블록만 선택한다', () => {
  const target = { name: 'stone', position: vec() };
  const exposedBot = {
    blockAt(position) {
      return position.y === 1
        ? { name: 'air', boundingBox: 'empty' }
        : { name: 'stone', boundingBox: 'block' };
    }
  };
  const buriedBot = { blockAt: () => ({ name: 'stone', boundingBox: 'block' }) };

  assert.equal(isExposedBlock(exposedBot, target), true);
  assert.equal(isExposedBlock(buriedBot, target), false);
});
