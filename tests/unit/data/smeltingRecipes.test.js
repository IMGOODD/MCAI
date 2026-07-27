const test = require('node:test');
const assert = require('node:assert/strict');
const smeltingRecipes = require('../../../src/data/smeltingRecipes');

test('제련 레시피 데이터가 action 밖에서 범용 데이터로 관리된다', () => {
  assert.equal(Object.keys(smeltingRecipes).length, 58);
  assert.equal(smeltingRecipes.iron_ingot.input, 'raw_iron');
  assert.deepEqual(
    smeltingRecipes.iron_ingot.alternatives,
    ['iron_ore', 'deepslate_iron_ore']
  );
  assert.equal(smeltingRecipes.iron_ingot.fuel, 'coal');
  assert.equal(smeltingRecipes.cooked_beef.input, 'beef');
  assert.equal(smeltingRecipes.glass.input, 'sand');
  assert.equal(smeltingRecipes.blue_glazed_terracotta.input, 'blue_terracotta');
  assert.equal(smeltingRecipes.iron_nugget.recyclingOnly, true);
});
