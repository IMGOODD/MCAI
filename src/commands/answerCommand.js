const result = require('../utils/commandResult');

module.exports = {
  async execute(bot, username, decision) {
    const items = bot.inventory.items();

    if (decision.target === 'inventory') {
      if (items.length === 0) {
        bot.chat('지금 내 인벤토리는 비어 있어.');
        return result.success('INVENTORY_REPORTED', { items: [] });
      }
      const inventory = items.map(item => ({ name: item.name, displayName: item.displayName, count: item.count }));
      bot.chat(`지금 ${items.map(item => `${item.displayName} ${item.count}`).join(', ')}개씩 있어`);
      return result.success('INVENTORY_REPORTED', { items: inventory });
    }

    if (decision.target === 'health') {
      bot.chat(`체력은 ${bot.health}칸이야.`);
      return result.success('HEALTH_REPORTED', { health: bot.health });
    }

    // Match exact Minecraft item IDs to keep tools out of block counts.
    const targetItems = items.filter(item => item.name === decision.target);
    const count = targetItems.reduce((sum, item) => sum + item.count, 0);
    if (count === 0) {
      bot.chat(`${decision.target}은(는) 가지고 있지 않아.`);
      return result.success('ITEM_COUNT_REPORTED', { item: decision.target, count: 0 });
    }
    bot.chat(`${decision.target}은(는) ${count}개 가지고 있어.`);
    return result.success('ITEM_COUNT_REPORTED', { item: decision.target, count });
  }
};
