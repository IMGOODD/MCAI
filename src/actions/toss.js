async function tossAllItems(bot) {
  const items = bot.inventory.items();

  try {
    for (const item of items) {
      await bot.tossStack(item);
      await bot.waitForTicks(5);
    }
    return true;
  } catch (error) {
    console.error('[toss] tossAllItems failed:', error);
    return false;
  }
}

async function tossItem(bot, itemName, count, options = {}) {
  return tossMatchingItems(bot, name => name === itemName, count, options);
}

async function tossMatchingItems(bot, matcher, count, options = {}) {
  const excludedSlots = new Set(options.excludeSlots || []);
  const items = bot.inventory.items().filter(item =>
    matcher(item.name) && !excludedSlots.has(item.slot)
  );
  if (items.length === 0) return false;

  let remain = count;
  try {
    for (const item of items) {
      if (remain <= 0) break;
      const amount = Math.min(item.count, remain);
      await bot.toss(item.type, null, amount);
      remain -= amount;
    }
    return remain === 0;
  } catch (error) {
    console.error('[toss] tossMatchingItems failed:', error);
    return false;
  }
}

module.exports = { tossAllItems, tossItem, tossMatchingItems };
