async function answer(bot) {
  const items = bot.inventory.items();

  if (items.length === 0) {
    bot.chat('인벤토리가 비어 있습니다.');
    return false;
  }

  const itemList = items.map(item => {
    const itemName = item.displayName || item.name;
    return `${itemName} x${item.count}`;
  });

  bot.chat(`인벤토리: ${itemList.join(', ')}`);
  return true;
}

module.exports = { answer };
