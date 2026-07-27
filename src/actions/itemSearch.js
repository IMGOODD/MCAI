const { goals, Movements } = require('mineflayer-pathfinder');
const resourceData = require('../data/resourceData');

function droppedItemName(entity, mcData) {
  if (!entity || entity.name !== 'item') return null;
  if (typeof entity.getDroppedItem === 'function') {
    const dropped = entity.getDroppedItem();
    if (dropped?.name) return dropped.name;
    if (dropped?.type != null) return mcData.items[dropped.type]?.name || null;
  }
  const itemId = entity.metadata?.[8]?.itemId;
  return itemId == null ? null : mcData.items[itemId]?.name || null;
}

async function collectAllItems(bot, targetName, options = {}) {
  const resource = resourceData[targetName];
  if (!resource) return false;
  return collectMatchingItems(bot, resource.tossMatcher, {
    ...options,
    label: targetName
  });
}

async function collectMatchingItems(bot, matcher, options = {}) {
  const mcData = require('minecraft-data')(bot.version);
  // Preserve the bot-wide movement policy. Replacing this object used to erase
  // water avoidance after every dropped-item pickup.
  const movements = bot.pathfinder.movements || new Movements(bot, mcData);
  const previousThinkTimeout = movements.thinkTimeout;
  movements.thinkTimeout = 3000;
  if (!bot.pathfinder.movements) bot.pathfinder.setMovements(movements);

  let attempts = 0;
  let foundAny = false;
  await bot.waitForTicks(5);
  while (attempts++ < (options.maxAttempts || 12)) {
    if (bot.isStopped) break;
    const targetItem = bot.nearestEntity(entity => {
      const name = droppedItemName(entity, mcData);
      return name != null && matcher(name);
    });
    if (!targetItem) break;
    foundAny = true;
    try {
      await bot.pathfinder.goto(new goals.GoalNear(
        Math.floor(targetItem.position.x),
        Math.floor(targetItem.position.y),
        Math.floor(targetItem.position.z),
        1
      ));
      if (bot.isStopped) break;
      await bot.waitForTicks(5);
    } catch (error) {
      console.warn(`[itemSearch] dropped ${options.label || 'item'} pickup failed: ${error.message}`);
      bot.pathfinder.setGoal(null);
      break;
    }
  }
  bot.pathfinder.setGoal(null);
  movements.thinkTimeout = previousThinkTimeout;
  return foundAny;
}

module.exports = { collectAllItems, collectMatchingItems, droppedItemName };
