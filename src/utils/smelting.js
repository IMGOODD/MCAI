const fuelData = require('../data/fuelData');

function fuelRequired(itemCount, itemsPerFuel = 8) {
  return Math.ceil(itemCount / itemsPerFuel);
}

function recipeInputs(recipe = {}) {
  return [recipe.input, ...(recipe.alternatives || [])].filter(Boolean);
}

function selectSmeltingInput(recipe, countItem, requiredCount = 1) {
  const inputs = recipeInputs(recipe);
  return inputs.find(name => countItem(name) >= requiredCount) ||
    inputs.find(name => countItem(name) > 0) ||
    inputs[0] || null;
}

function fuelInfo(itemName) {
  return fuelData.fuels[itemName] || null;
}

function selectSmeltingFuel(countItem, smeltCount = 1) {
  for (const [name, info] of Object.entries(fuelData.fuels)) {
    // Preserve craftable materials and tools unless they are explicitly selected.
    if (['wood', 'crafted_wood', 'wooden_tool', 'bamboo_wood', 'wool'].includes(info.category)) {
      continue;
    }
    const required = fuelRequired(smeltCount, info.itemsPerFuel);
    const available = countItem(name);
    if (available >= required) return { name, required, available, ...info };
  }

  const name = fuelData.defaultFuel;
  const info = fuelInfo(name);
  return {
    name,
    required: fuelRequired(smeltCount, info.itemsPerFuel),
    available: countItem(name),
    ...info
  };
}

module.exports = {
  fuelRequired,
  recipeInputs,
  selectSmeltingInput,
  selectSmeltingFuel,
  fuelInfo
};
