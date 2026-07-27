const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafePlacementReference } = require('../../../src/actions/place');

test('제작대 설치 위치 주변에 물이 있으면 안전하지 않다고 판단한다', () => {
  const position = { offset: (x, y, z) => ({ x, y, z, offset: position.offset }) };
  const reference = { name: 'stone', boundingBox: 'block', position };
  const bot = {
    blockAt(pos) {
      if (pos.x === 1 && pos.y === 0) return { name: 'water', boundingBox: 'empty' };
      return { name: 'air', boundingBox: 'empty' };
    }
  };

  assert.equal(isSafePlacementReference(bot, reference), false);
});
