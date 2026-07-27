const { goals: { GoalLookAtBlock } } = require('mineflayer-pathfinder');
const { placing } = require('../actions/place');

async function findOrPlaceCraftingTable(bot, mcData) {
  let craftingTable = bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 32 });
  if (craftingTable) return craftingTable;
  if (!bot.inventory.items().some(item => item.name === 'crafting_table')) return null;
  if (!await placing(bot, 'crafting_table')) return null;
  return bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 6 });
}

function resolveItemName(bot, itemName) {
  if (itemName !== 'planks') return itemName;
  const log = bot.inventory.items().find(item => item.name.endsWith('_log'));
  return log ? log.name.replace('_log', '_planks') : null;
}

function recipeIngredients(recipe, mcData) {
  const source = recipe.inShape ? recipe.inShape.flat() : (recipe.ingredients || []);
  return source
    .filter(ingredient => ingredient && ingredient.id !== -1)
    .map(ingredient => ({
      name: mcData.items[ingredient.id]?.name || `item_${ingredient.id}`,
      count: ingredient.count || 1,
      metadata: ingredient.metadata ?? null
    }));
}

function logCraftState(bot, mcData, itemName, recipe) {
  console.log('[craft:state]', {
    itemName,
    recipeIngredients: recipeIngredients(recipe, mcData),
    inventory: bot.inventory.items().map(item => ({
      name: item.name,
      count: item.count,
      slot: item.slot,
      metadata: item.metadata
    })),
    window: bot.currentWindow?.title || null
  });
}

async function waitForInventorySync(bot, ticks = 5) {
  if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(ticks);
}

async function approachCraftingTable(bot, craftingTable) {
  await bot.pathfinder.goto(new GoalLookAtBlock(
    craftingTable.position,
    bot.world,
    { reach: 4 }
  ));
  bot.pathfinder.setGoal(null);
  await waitForInventorySync(bot);

  if (typeof bot.blockAt !== 'function') return craftingTable;
  const currentBlock = bot.blockAt(craftingTable.position);
  return currentBlock?.name === 'crafting_table' ? currentBlock : null;
}

function isRetryableCraftError(error) {
  const message = error?.message || '';
  return message.includes('missing ingredient') ||
    (message.includes('windowOpen') && message.includes('timeout'));
}

async function craftTool(bot, mcData, itemName, requestedCount = 1) {
  const resolvedItemName = resolveItemName(bot, itemName);
  const item = resolvedItemName ? mcData.itemsByName[resolvedItemName] : null;
  if (!item) {
    console.warn(`[craft] item not found: ${itemName}`);
    return false;
  }
  let craftingTable = null;
  let recipe = bot.recipesFor(item.id, null, requestedCount, null)[0];
  if (!recipe) {
    craftingTable = await findOrPlaceCraftingTable(bot, mcData);
    if (!craftingTable) {
      console.warn(`[craft] crafting table unavailable: ${itemName}`);
      return false;
    }
    try {
      craftingTable = await approachCraftingTable(bot, craftingTable);
      if (!craftingTable) {
        console.warn(`[craft] crafting table disappeared before use: ${itemName}`);
        return false;
      }
    } catch (err) {
      console.error(`[craft] cannot reach crafting table for ${itemName}:`, err.message);
      return false;
    }
    recipe = bot.recipesFor(item.id, null, requestedCount, craftingTable)[0];
  }
  if (!recipe) {
    console.warn(`[craft] recipe or ingredients unavailable: ${itemName}`);
    return false;
  }
  const resultCount = recipe.result && recipe.result.count ? recipe.result.count : 1;
  const craftCount = Math.ceil(requestedCount / resultCount);
  logCraftState(bot, mcData, itemName, recipe);
  try {
    await bot.craft(recipe, craftCount, craftingTable);
    return true;
  } catch (err) {
    if (isRetryableCraftError(err)) {
      const retryReason = err.message.includes('windowOpen')
        ? 'crafting_table_window_timeout'
        : 'inventory_desync';
      console.warn('[craft:retry]', { itemName, reason: retryReason });
      if (bot.currentWindow && typeof bot.closeWindow === 'function') {
        bot.closeWindow(bot.currentWindow);
      }
      await waitForInventorySync(bot, 10);

      if (craftingTable) {
        try {
          const refreshedTable = typeof bot.blockAt === 'function'
            ? bot.blockAt(craftingTable.position)
            : craftingTable;
          if (!refreshedTable || refreshedTable.name !== 'crafting_table') {
            console.error(`[craft] retry crafting table unavailable: ${itemName}`);
            return false;
          }
          craftingTable = await approachCraftingTable(bot, refreshedTable);
        } catch (moveError) {
          console.error(`[craft] retry cannot reach crafting table for ${itemName}:`, moveError.message);
          return false;
        }
      }

      const retryRecipe = bot.recipesFor(item.id, null, requestedCount, craftingTable)[0];
      if (retryRecipe) {
        logCraftState(bot, mcData, `${itemName}:retry`, retryRecipe);
        try {
          await bot.craft(retryRecipe, craftCount, craftingTable);
          return true;
        } catch (retryError) {
          console.error('[craft] retry failed:', retryError.message);
          return false;
        }
      }
      console.error(`[craft] retry recipe unavailable: ${itemName}`);
      return false;
    }
    console.error('[craft] failed:', err.message);
    return false;
  }
}

module.exports = { craftTool, resolveItemName, recipeIngredients };
