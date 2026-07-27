const minecraftData = require('minecraft-data');
const resourceData = require('../../data/resourceData');
const smeltingRecipes = require('../../data/smeltingRecipes');
const { tierOrder } = require('../../data/toolpriority');
const { selectSmeltingInput, selectSmeltingFuel } = require('../../utils/smelting');

function plannerLog(stage, data) {
  console.log(`[planner:${stage}]`, data);
}

const TOOL_FOR_RESOURCE = {
  pickaxe: {
    wooden: 'wooden_pickaxe',
    stone: 'stone_pickaxe',
    iron: 'iron_pickaxe',
    diamond: 'diamond_pickaxe'
  }
};

class UnsupportedMaterialError extends Error {
  constructor(itemName, detail = '') {
    super(`지원하지 않는 재료: ${itemName}.${detail ? ` ${detail}` : ''}`);
    this.name = 'UnsupportedMaterialError';
    this.itemName = itemName;
  }
}

function inventoryItems(bot) {
  return bot?.inventory && typeof bot.inventory.items === 'function' ? bot.inventory.items() : [];
}

function itemCount(bot, matcher) {
  return inventoryItems(bot).filter(item => matcher(item.name)).reduce((sum, item) => sum + item.count, 0);
}

function hasPickaxeAtLeast(bot, minimumTier) {
  const start = tierOrder.indexOf(minimumTier);
  return start !== -1 && tierOrder.slice(start).some(tier => itemCount(bot, name => name === `${tier}_pickaxe`) > 0);
}

function ingredientId(ingredient) {
  return typeof ingredient === 'number' ? ingredient : ingredient?.id;
}

function ingredientCount(ingredient) {
  return typeof ingredient === 'object' && ingredient?.count ? ingredient.count : 1;
}

function recipeIngredients(recipe) {
  const source = recipe.inShape ? recipe.inShape.flat().filter(value => value != null) : (recipe.ingredients || []);
  const counts = new Map();
  for (const ingredient of source) {
    const id = ingredientId(ingredient);
    if (id == null) continue;
    counts.set(id, (counts.get(id) || 0) + ingredientCount(ingredient));
  }
  return counts;
}

function requiresTable(recipe) {
  if (!recipe.inShape) return false;
  return recipe.inShape.length > 2 || Math.max(...recipe.inShape.map(row => row.length)) > 2;
}

function createPlan(bot, task, options = {}) {
  plannerLog('goal', task);
  if (!task || !task.action || !task.target) return [task];
  if (!['craftCommand', 'collectCommand', 'collectResourceCommand'].includes(task.action)) return [task];

  const mcData = options.mcData || minecraftData(bot?.version || '1.20.1');
  const steps = [];
  const stock = options.stock ||
    new Map(inventoryItems(bot).map(item => [item.name, (item.count || 0)]));
  const hasWoodPreference = [...stock.entries()].some(([name, amount]) =>
    amount > 0 && (name.endsWith('_log') || name.endsWith('_planks'))
  );
  const selectedPlanks = choosePlanks(stock, mcData);
  const nearbyCraftingTable = Boolean(
    typeof bot?.findBlock === 'function' &&
    mcData.blocksByName.crafting_table &&
    bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 32 })
  );
  const nearbyFurnaceBlock = (
    typeof bot?.findBlock === 'function' &&
    mcData.blocksByName.furnace &&
    bot.findBlock({ matching: mcData.blocksByName.furnace.id, maxDistance: 32 })
  );
  const nearbyFurnace = Boolean(nearbyFurnaceBlock);
  plannerLog('context', {
    inventory: Object.fromEntries(stock),
    selectedPlanks,
    woodSelection: hasWoodPreference ? 'inventory' : 'any_nearby_log',
    nearbyCraftingTable,
    nearbyFurnace
  });

  const count = name => stock.get(name) || 0;
  const add = (name, amount) => stock.set(name, count(name) + amount);
  const consume = (name, amount) => stock.set(name, count(name) - amount);
  const reservedToolDurability = new Map();

  function resourceForItem(itemName) {
    return Object.entries(resourceData).find(([, resource]) => resource.tossMatcher(itemName));
  }

  function toolDurability(itemName) {
    return mcData.itemsByName[itemName]?.maxDurability || 0;
  }

  function availableToolDurability(resource) {
    const minimum = tierOrder.indexOf(resource.minTier);
    if (minimum < 0) return 0;

    let total = 0;
    for (const tier of tierOrder.slice(minimum)) {
      const itemName = `${tier}_${resource.tool}`;
      const maxDurability = toolDurability(itemName);
      const actualTools = inventoryItems(bot).filter(item => item.name === itemName);
      total += actualTools.reduce((sum, item) => {
        const used = Math.max(0, item.durabilityUsed || 0);
        return sum + Math.max(0, (item.maxDurability || maxDurability) - used);
      }, 0);

      const plannedTools = Math.max(0, count(itemName) - actualTools.length);
      total += plannedTools * maxDurability;
    }
    return Math.max(0, total - (reservedToolDurability.get(resource.tool) || 0));
  }

  function ensureTool(resource, stack, blocksNeeded = 1) {
    if (!resource.tool || resource.minTier === 'hand') return;
    if (resource.tool !== 'pickaxe') throw new UnsupportedMaterialError(resource.tool, '해당 도구 계열의 자동 준비 규칙이 없습니다.');
    const requiredDurability = blocksNeeded +
      Math.max(2, Math.ceil(blocksNeeded * 0.1));
    const availableDurability = availableToolDurability(resource);
    const hasTool = availableDurability >= requiredDurability;
    plannerLog('tool-check', {
      tool: resource.tool,
      minimumTier: resource.minTier,
      blocksNeeded,
      requiredDurability,
      availableDurability,
      alreadyReserved: reservedToolDurability.get(resource.tool) || 0,
      hasTool
    });
    if (hasTool) {
      reservedToolDurability.set(
        resource.tool,
        (reservedToolDurability.get(resource.tool) || 0) + requiredDurability
      );
      return;
    }
    const tool = TOOL_FOR_RESOURCE.pickaxe[resource.minTier];
    if (!tool) throw new UnsupportedMaterialError(`${resource.minTier}_${resource.tool}`);
    const maxDurability = toolDurability(tool);
    if (maxDurability <= 0) {
      throw new UnsupportedMaterialError(tool, '도구 내구도 정보를 찾지 못했습니다.');
    }
    const shortage = requiredDurability - availableDurability;
    const additionalTools = Math.ceil(shortage / maxDurability);
    plannerLog('tool-reserve', {
      tool,
      additionalTools,
      shortage,
      maxDurability
    });
    ensureItem(tool, count(tool) + additionalTools, stack);
    reservedToolDurability.set(
      resource.tool,
      (reservedToolDurability.get(resource.tool) || 0) + requiredDurability
    );
  }

  function collect(resourceName, itemName, amount, stack) {
    if (amount <= 0) return;
    const resource = resourceData[resourceName];
    ensureTool(resource, stack, amount);
    plannerLog('add-collect', { resourceName, itemName, amount });
    const collectStep = { action: 'collectResourceCommand', target: resourceName, count: amount };
    // Preserve the exact item required when a resource group has multiple drops.
    if (resourceName === 'stone' || (resourceName === 'log' && hasWoodPreference)) {
      collectStep.expectedItem = itemName;
    }
    steps.push(collectStep);
    add(itemName, amount);
  }

  function candidateRecipes(itemName, stack) {
    const item = mcData.itemsByName[itemName];
    if (!item) return [];
    const recipes = mcData.recipes[item.id] || [];
    return recipes
      .filter(recipe => ![...recipeIngredients(recipe).keys()].some(id => stack.has(mcData.items[id]?.name)))
      .sort((a, b) => recipeScore(b) - recipeScore(a));
  }

  function recipeScore(recipe) {
    let score = 0;
    for (const id of recipeIngredients(recipe).keys()) {
      const name = mcData.items[id]?.name;
      score += count(name) * 10;
      if (name === selectedPlanks) score += 100;
      if (resourceForItem(name)) score += 2;
    }
    return score;
  }

  function ensureSmeltedItem(itemName, wanted, stack) {
    const recipe = smeltingRecipes[itemName];
    if (!recipe || recipe.recyclingOnly) return false;

    const missing = wanted - count(itemName);
    if (missing <= 0) return true;

    const selectedFuel = selectSmeltingFuel(count, missing);
    const requiredFuel = selectedFuel.required;
    const selectedInput = selectSmeltingInput(recipe, count, missing);
    plannerLog('smelt-recipe', {
      itemName,
      missing,
      input: { name: selectedInput, required: missing },
      fuel: {
        name: selectedFuel.name,
        required: requiredFuel,
        available: selectedFuel.available,
        itemsPerFuel: selectedFuel.itemsPerFuel
      },
      nearbyFurnace
    });

    ensureItem(selectedInput, missing, stack);
    ensureItem(selectedFuel.name, requiredFuel, stack);
    if (!nearbyFurnace && count('furnace') <= 0) ensureItem('furnace', 1, stack);

    consume(selectedInput, missing);
    consume(selectedFuel.name, requiredFuel);
    const smeltStep = {
      action: 'smeltCommand',
      target: itemName,
      count: missing
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
    add(itemName, missing);
    plannerLog('add-smelt', { itemName, count: missing });
    return true;
  }

  function ensureItem(itemName, wanted, stack = new Set()) {
    const missing = wanted - count(itemName);
    plannerLog('ensure-item', {
      itemName,
      wanted,
      ownedOrPlanned: count(itemName),
      missing,
      depth: stack.size
    });
    if (missing <= 0) return;
    const natural = resourceForItem(itemName);
    if (natural) {
      collect(natural[0], itemName, missing, stack);
      return;
    }
    if (ensureSmeltedItem(itemName, wanted, stack)) return;
    if (stack.has(itemName)) throw new UnsupportedMaterialError(itemName, '레시피 순환이 감지되었습니다.');

    const nextStack = new Set(stack).add(itemName);
    const recipes = candidateRecipes(itemName, nextStack);
    plannerLog('recipe-candidates', { itemName, count: recipes.length });
    let lastError;
    for (const recipe of recipes) {
      const snapshot = new Map(stock);
      const stepLength = steps.length;
      try {
        plannerLog('try-recipe', {
          itemName,
          ingredients: Object.fromEntries(
            [...recipeIngredients(recipe)].map(([id, amount]) => [mcData.items[id]?.name || id, amount])
          ),
          resultCount: recipe.result?.count || 1,
          requiresTable: requiresTable(recipe)
        });
        if (requiresTable(recipe) && !nearbyCraftingTable) ensureItem('crafting_table', 1, nextStack);
        const outputCount = recipe.result?.count || 1;
        const crafts = Math.ceil((wanted - count(itemName)) / outputCount);
        for (const [id, perCraft] of recipeIngredients(recipe)) {
          const ingredient = mcData.items[id]?.name;
          if (!ingredient) throw new UnsupportedMaterialError(`item_id_${id}`);
          const required = perCraft * crafts;
          ensureItem(ingredient, required, nextStack);
          consume(ingredient, required);
          plannerLog('reserve-material', {
            forItem: itemName,
            ingredient,
            required,
            remaining: count(ingredient)
          });
        }
        const commandTarget = itemName === selectedPlanks ? 'planks' : itemName;
        plannerLog('add-craft', {
          itemName,
          commandTarget,
          count: crafts * outputCount
        });
        steps.push({ action: 'craftCommand', target: commandTarget, count: crafts * outputCount });
        add(itemName, crafts * outputCount);
        return;
      } catch (error) {
        plannerLog('recipe-rejected', { itemName, reason: error.message });
        stock.clear();
        for (const [name, amount] of snapshot) stock.set(name, amount);
        steps.length = stepLength;
        lastError = error;
      }
    }
    throw lastError || new UnsupportedMaterialError(itemName, '제작 레시피나 자연 자원 매핑이 없습니다.');
  }

  function planCraftGoal() {
    ensureItem(task.target, Math.max(1, task.count || 1));
  }

  function planCollectGoal() {
    const resource = resourceData[task.target];
    if (!resource) throw new UnsupportedMaterialError(task.target, '채집 가능한 자연 자원으로 등록되어 있지 않습니다.');
    const requested = Math.max(1, task.count || 1);
    const owned = itemCount(bot, resource.tossMatcher);
    const missing = Math.max(0, requested - owned);
    if (missing > 0) {
      ensureTool(resource, new Set(), missing);
      const collectStep = { action: task.action, target: task.target, count: missing };
      if (missing !== requested) collectStep.deliveryCount = requested;
      steps.push(collectStep);
    }
  }

  if (task.action === 'craftCommand') planCraftGoal();
  else planCollectGoal();

  plannerLog('result', steps);
  return steps;
}

function choosePlanks(stock, mcData) {
  const log = [...stock.entries()].find(([name, amount]) => amount > 0 && name.endsWith('_log'))?.[0];
  const matching = log?.replace('_log', '_planks');
  if (matching && mcData.itemsByName[matching]) return matching;
  const planks = [...stock.entries()].find(([name, amount]) => amount > 0 && name.endsWith('_planks'))?.[0];
  return planks || 'oak_planks';
}

module.exports = {
  domain: 'crafting',
  canHandle(task) {
    return task?.action === 'craftCommand';
  },
  createPlan,
  createCraftingPlan: createPlan,
  hasPickaxeAtLeast,
  itemCount,
  UnsupportedMaterialError,
  recipeIngredients,
  requiresTable
};
