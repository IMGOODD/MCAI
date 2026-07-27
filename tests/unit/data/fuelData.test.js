const test = require('node:test');
const assert = require('node:assert/strict');
const fuelData = require('../../../src/data/fuelData');
const {
  fuelInfo,
  fuelRequired,
  selectSmeltingFuel
} = require('../../../src/utils/smelting');

test('대표 대체 연료의 제련 가능 수량을 관리한다', () => {
  assert.equal(fuelInfo('coal').itemsPerFuel, 8);
  assert.equal(fuelInfo('charcoal').itemsPerFuel, 8);
  assert.equal(fuelInfo('lava_bucket').itemsPerFuel, 100);
  assert.equal(fuelInfo('bamboo').itemsPerFuel, 0.25);
  assert.equal(fuelRequired(8, fuelInfo('bamboo').itemsPerFuel), 32);
});

test('마그마 블록은 연료에서 제외하고 마그마 표현은 용암 양동이로 구분한다', () => {
  assert.equal(fuelInfo('magma_block'), null);
  assert.equal(fuelData.nonFuels.includes('magma_block'), true);
  assert.equal(fuelData.aliases.magma, 'lava_bucket');
});

test('석탄이 없으면 보유한 목탄이나 대나무를 대체 연료로 선택한다', () => {
  const charcoal = selectSmeltingFuel(
    name => name === 'charcoal' ? 1 : 0,
    8
  );
  assert.equal(charcoal.name, 'charcoal');
  assert.equal(charcoal.required, 1);

  const bamboo = selectSmeltingFuel(
    name => name === 'bamboo' ? 32 : 0,
    8
  );
  assert.equal(bamboo.name, 'bamboo');
  assert.equal(bamboo.required, 32);
});
