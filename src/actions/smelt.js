const { goals: { GoalGetToBlock, GoalNear } } = require('mineflayer-pathfinder');
const { placing } = require('./place');
const smeltingRecipes = require('../data/smeltingRecipes');
const {
  fuelRequired,
  selectSmeltingInput,
  selectSmeltingFuel,
  fuelInfo
} = require('../utils/smelting');

function inventoryCount(bot, itemName) {
  return bot.inventory.items()
    .filter(item => item.name === itemName)
    .reduce((sum, item) => sum + item.count, 0);
}

async function findOrPlaceFurnace(bot, mcData, preferredPosition = null) {
  const furnaceData = mcData.blocksByName.furnace;
  if (!furnaceData) return null;

  let furnaceBlock = bot.findBlock({ matching: furnaceData.id, maxDistance: 32 });
  if (furnaceBlock) {
    console.log('[smelt:furnace]', { source: 'nearby', position: furnaceBlock.position });
    return furnaceBlock;
  }

  if (preferredPosition) {
    console.log('[smelt:furnace-return]', { position: preferredPosition });
    try {
      await bot.pathfinder.goto(new GoalNear(
        preferredPosition.x,
        preferredPosition.y,
        preferredPosition.z,
        3
      ));
      bot.pathfinder.setGoal(null);
      furnaceBlock = bot.findBlock({ matching: furnaceData.id, maxDistance: 6 });
      if (furnaceBlock) {
        console.log('[smelt:furnace]', {
          source: 'planned-position',
          position: furnaceBlock.position
        });
        return furnaceBlock;
      }
      console.warn('[smelt] planned furnace not found after return:', preferredPosition);
    } catch (error) {
      console.warn('[smelt] cannot return to planned furnace:', {
        position: preferredPosition,
        error: error.message
      });
    }
  }

  if (!bot.inventory.items().some(item => item.name === 'furnace')) return null;
  if (!await placing(bot, 'furnace')) return null;

  furnaceBlock = bot.findBlock({ matching: furnaceData.id, maxDistance: 6 });
  if (furnaceBlock) {
    console.log('[smelt:furnace]', { source: 'placed', position: furnaceBlock.position });
  }
  return furnaceBlock;
}

async function waitForOutput(bot, furnace, outputName, count, timeoutTicks) {
  let waitedTicks = 0;
  while (waitedTicks <= timeoutTicks) {
    if (bot.isStopped) return { success: false, code: 'SMELT_STOPPED' };

    const output = furnace.outputItem();
    console.log('[smelt:progress]', {
      output: output?.name || null,
      count: output?.count || 0,
      requested: count,
      progress: furnace.progress ?? null,
      fuel: furnace.fuel ?? null,
      waitedTicks
    });
    if (output?.name === outputName && output.count >= count) {
      return { success: true };
    }

    await bot.waitForTicks(10);
    waitedTicks += 10;
  }
  return { success: false, code: 'SMELT_TIMEOUT' };
}

async function smeltItem(bot, mcData, outputName, requestedCount = 1, options = {}) {
  const recipe = smeltingRecipes[outputName];
  const count = Math.max(1, requestedCount);
  if (!recipe) {
    console.warn('[smelt] unsupported output:', outputName);
    return { success: false, code: 'SMELT_UNSUPPORTED', data: { item: outputName } };
  }

  const selectedInput = selectSmeltingInput(
    recipe,
    itemName => inventoryCount(bot, itemName),
    count
  );
  const inputItem = mcData.itemsByName[selectedInput];
  const availableInput = inventoryCount(bot, selectedInput);
  const requestedFuelInfo = options.fuel && fuelInfo(options.fuel);
  let selectedFuel = requestedFuelInfo
    ? {
        name: options.fuel,
        required: fuelRequired(count, requestedFuelInfo.itemsPerFuel),
        available: inventoryCount(bot, options.fuel),
        ...requestedFuelInfo
      }
    : selectSmeltingFuel(itemName => inventoryCount(bot, itemName), count);
  let fuelItem = mcData.itemsByName[selectedFuel.name];

  console.log('[smelt:start]', {
    output: outputName,
    input: selectedInput,
    requested: count,
    fuel: selectedFuel.name,
    requiredFuel: selectedFuel.required,
    availableInput,
    availableFuel: selectedFuel.available,
    itemsPerFuel: selectedFuel.itemsPerFuel
  });

  if (!inputItem || !fuelItem) {
    return { success: false, code: 'SMELT_DATA_UNAVAILABLE', data: { item: outputName } };
  }
  if (availableInput < count) {
    return {
      success: false,
      code: 'SMELT_MATERIALS_MISSING',
      data: {
        item: outputName,
        input: { name: selectedInput, required: count, available: availableInput },
        fuel: {
          name: selectedFuel.name,
          required: selectedFuel.required,
          available: selectedFuel.available
        }
      }
    };
  }

  const furnaceBlock = await findOrPlaceFurnace(
    bot,
    mcData,
    options.furnacePosition || null
  );
  if (!furnaceBlock) {
    return { success: false, code: 'FURNACE_UNAVAILABLE', data: { item: outputName } };
  }

  let furnace;
  try {
    await bot.pathfinder.goto(new GoalGetToBlock(
      furnaceBlock.position.x,
      furnaceBlock.position.y,
      furnaceBlock.position.z
    ));
    bot.pathfinder.setGoal(null);
    furnace = await bot.openFurnace(furnaceBlock);

    const occupiedInput = furnace.inputItem();
    const occupiedFuel = furnace.fuelItem();
    const occupiedOutput = furnace.outputItem();
    const occupiedFuelInfo = occupiedFuel ? fuelInfo(occupiedFuel.name) : null;
    const incompatibleFuel = occupiedFuel && !occupiedFuelInfo;
    if (occupiedInput || incompatibleFuel || occupiedOutput) {
      console.warn('[smelt] furnace contents conflict with request', {
        input: occupiedInput?.name || null,
        fuel: occupiedFuel?.name || null,
        output: occupiedOutput?.name || null
      });
      return {
        success: false,
        code: 'FURNACE_OCCUPIED',
        data: {
          input: occupiedInput?.name || null,
          fuel: occupiedFuel?.name || null,
          output: occupiedOutput?.name || null
        }
      };
    }

    if (occupiedFuel) {
      const occupiedRequired = fuelRequired(count, occupiedFuelInfo.itemsPerFuel);
      const occupiedAvailable = occupiedFuel.count + inventoryCount(bot, occupiedFuel.name);
      if (occupiedAvailable < occupiedRequired) {
        console.warn('[smelt] existing fuel cannot finish request', {
          fuel: occupiedFuel.name,
          required: occupiedRequired,
          available: occupiedAvailable,
          selectedAlternative: selectedFuel.name
        });
        return {
          success: false,
          code: 'FURNACE_OCCUPIED',
          data: {
            input: null,
            fuel: occupiedFuel.name,
            output: null,
            reason: 'EXISTING_FUEL_INSUFFICIENT'
          }
        };
      }
      selectedFuel = {
        name: occupiedFuel.name,
        required: occupiedRequired,
        available: occupiedAvailable,
        ...occupiedFuelInfo
      };
      fuelItem = mcData.itemsByName[selectedFuel.name];
    }

    const fuelInFurnace = occupiedFuel?.count || 0;
    const availableFuel = inventoryCount(bot, selectedFuel.name);
    const totalAvailableFuel = availableFuel + fuelInFurnace;
    if (totalAvailableFuel < selectedFuel.required) {
      return {
        success: false,
        code: 'SMELT_MATERIALS_MISSING',
        data: {
          item: outputName,
          input: { name: selectedInput, required: count, available: availableInput },
          fuel: {
            name: selectedFuel.name,
            required: selectedFuel.required,
            available: totalAvailableFuel
          }
        }
      };
    }

    const fuelToAdd = Math.max(0, selectedFuel.required - fuelInFurnace);
    await furnace.putInput(inputItem.id, null, count);
    if (fuelToAdd > 0) {
      await furnace.putFuel(fuelItem.id, null, fuelToAdd);
    }
    console.log('[smelt:loaded]', {
      input: selectedInput,
      inputCount: count,
      fuel: selectedFuel.name,
      fuelRequired: selectedFuel.required,
      fuelInFurnace,
      fuelAdded: fuelToAdd
    });

    const waitResult = await waitForOutput(bot, furnace, outputName, count, count * 240 + 100);
    if (!waitResult.success) {
      return { success: false, code: waitResult.code, data: { item: outputName, requested: count } };
    }

    const output = await furnace.takeOutput();
    if (selectedFuel.returnItem && furnace.fuelItem()?.name === selectedFuel.returnItem) {
      await furnace.takeFuel();
      console.log('[smelt:fuel-container-returned]', {
        fuel: selectedFuel.name,
        item: selectedFuel.returnItem
      });
    }
    const smelted = output?.count || count;
    console.log('[smelt:complete]', { item: outputName, smelted });
    return {
      success: true,
      code: 'SMELT_COMPLETED',
      data: {
        item: outputName,
        input: selectedInput,
        fuel: selectedFuel.name,
        fuelUsed: fuelToAdd,
        fuelInFurnace,
        smelted
      }
    };
  } catch (error) {
    console.error('[smelt] failed:', error.message);
    return {
      success: false,
      code: 'SMELT_FAILED',
      data: { item: outputName, requested: count, error: error.message }
    };
  } finally {
    try { furnace?.close(); } catch (error) {
      console.warn('[smelt] furnace close failed:', error.message);
    }
    bot.pathfinder.setGoal(null);
  }
}

module.exports = {
  findOrPlaceFurnace,
  // Keep helper exports for existing imports.
  fuelRequired,
  inventoryCount,
  smeltItem,
  waitForOutput
};
