const minecraftData = require('minecraft-data');
const craftingPlanner = require('./craftingPlanner');
const smeltingRecipes = require('../../data/smeltingRecipes');
const { selectSmeltingInput, selectSmeltingFuel } = require('../../utils/smelting');

function plannerLog(stage, data) {
  console.log(`[smelting-planner:${stage}]`, data);
}

function inventoryItems(bot) {
  return bot?.inventory && typeof bot.inventory.items === 'function'
    ? bot.inventory.items()
    : [];
}

function inventoryCount(bot, itemName) {
  return inventoryItems(bot)
    .filter(item => item.name === itemName)
    .reduce((sum, item) => sum + item.count, 0);
}

function hasNearbyFurnace(bot, mcData) {
  const furnace = mcData.blocksByName.furnace;
  return Boolean(
    furnace &&
    typeof bot?.findBlock === 'function' &&
    bot.findBlock({ matching: furnace.id, maxDistance: 32 })
  );
}

function findNearbyFurnace(bot, mcData) {
  const furnace = mcData.blocksByName.furnace;
  if (!furnace || typeof bot?.findBlock !== 'function') return null;
  return bot.findBlock({ matching: furnace.id, maxDistance: 32 }) || null;
}

function createPlan(bot, task, options = {}) {
  plannerLog('goal', task);
  if (!task || task.action !== 'smeltCommand' || !task.target) return [task];

  const recipe = smeltingRecipes[task.target];
  if (!recipe) {
    throw new craftingPlanner.UnsupportedMaterialError(
      task.target,
      '등록된 제련 레시피가 없습니다.'
    );
  }

  const mcData = options.mcData || minecraftData(bot?.version || '1.20.1');
  const requested = Math.max(1, task.count || 1);
  const ownedOutput = inventoryCount(bot, task.target);

  // A smelting count is additional output, not a target inventory total.
  const smeltCount = requested;
  const selectedFuel = selectSmeltingFuel(
    itemName => inventoryCount(bot, itemName),
    smeltCount
  );
  const requiredFuel = selectedFuel.required;
  const availableFuel = selectedFuel.available;
  const selectedInput = selectSmeltingInput(
    recipe,
    itemName => inventoryCount(bot, itemName),
    smeltCount
  );
  const availableInput = inventoryCount(bot, selectedInput);
  const furnaceInInventory = inventoryCount(bot, 'furnace') > 0;
  const nearbyFurnaceBlock = findNearbyFurnace(bot, mcData);
  const nearbyFurnace = Boolean(nearbyFurnaceBlock);

  plannerLog('context', {
    output: task.target,
    requested,
    ownedOutput,
    countMode: 'additional_output',
    input: { name: selectedInput, required: smeltCount, available: availableInput },
    fuel: {
      name: selectedFuel.name,
      required: selectedFuel.required,
      available: selectedFuel.available,
      itemsPerFuel: selectedFuel.itemsPerFuel
    },
    furnaceInInventory,
    nearbyFurnace
  });

  if (availableInput < smeltCount) {
    throw new craftingPlanner.UnsupportedMaterialError(
      selectedInput,
      `제련에 ${smeltCount}개가 필요하지만 ${availableInput}개만 보유하고 있습니다.`
    );
  }
  if (selectedFuel.available < selectedFuel.required) {
    throw new craftingPlanner.UnsupportedMaterialError(
      selectedFuel.name,
      `제련 연료가 ${requiredFuel}개 필요하지만 ${availableFuel}개만 보유하고 있습니다.`
    );
  }

  const steps = [];
  if (!furnaceInInventory && !nearbyFurnace) {
    plannerLog('prepare-furnace', { reason: 'furnace_missing' });
    steps.push(...craftingPlanner.createCraftingPlan(bot, {
      action: 'craftCommand',
      target: 'furnace',
      count: 1
    }, options));
  }

  const smeltStep = {
    action: 'smeltCommand',
    target: task.target,
    count: smeltCount
  };
  if (selectedFuel.name !== 'coal') smeltStep.fuel = selectedFuel.name;
  if (nearbyFurnaceBlock?.position) {
    smeltStep.furnacePosition = {
      x: nearbyFurnaceBlock.position.x,
      y: nearbyFurnaceBlock.position.y,
      z: nearbyFurnaceBlock.position.z
    };
  }
  steps.push(smeltStep);
  plannerLog('result', steps);
  return steps;
}

module.exports = {
  domain: 'smelting',
  canHandle(task) {
    return task?.action === 'smeltCommand';
  },
  createPlan,
  findNearbyFurnace,
  hasNearbyFurnace,
  inventoryCount
};
