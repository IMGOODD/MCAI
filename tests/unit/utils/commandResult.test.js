const test = require('node:test');
const assert = require('node:assert/strict');
const result = require('../../../src/utils/commandResult');

test('command 성공과 실패는 동일한 success, code, data 구조를 사용한다', () => {
  assert.deepEqual(result.success('RESOURCE_COLLECTED', { resource: 'dirt', acquired: 100 }), {
    success: true,
    code: 'RESOURCE_COLLECTED',
    data: { resource: 'dirt', acquired: 100 }
  });

  assert.deepEqual(result.failure('RESOURCE_COLLECTION_FAILED', { resource: 'dirt', acquired: 0 }), {
    success: false,
    code: 'RESOURCE_COLLECTION_FAILED',
    data: { resource: 'dirt', acquired: 0 }
  });
});
