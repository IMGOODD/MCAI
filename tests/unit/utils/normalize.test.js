const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTarget } = require('../../../src/utils/noramlize');

test('normalizeTarget은 등록되지 않은 대상을 그대로 반환한다', () => {
  assert.equal(normalizeTarget('log'), 'log');
  assert.equal(normalizeTarget('diamond'), 'diamond');
});
