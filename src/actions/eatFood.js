
// Foods the bot can consume automatically.
const FOOD_NAMES = [
  'cooked_beef', 'cooked_chicken', 'cooked_porkchop', 'cooked_mutton', 'cooked_cod', 'cooked_salmon',
  'cooked_rabbit', 'baked_potato', 'bread', 'golden_carrot', 'golden_apple',
  'mushroom_stew', 'rabbit_stew', 'beetroot_soup', 'pumpkin_pie',
  'apple', 'carrot', 'melon_slice', 'sweet_berries', 'glow_berries'
];

// Consume an available food item when hunger is not full.
async function eatFood(bot) {
  if (bot.food >= 20) {
    return false;
  }

  const foodItem = bot.inventory.items().find(item => FOOD_NAMES.includes(item.name));

  if (!foodItem) {
    console.log('[eatFood] 인벤토리에 먹을 수 있는 음식이 없습니다.');
    return false;
  }

  try {
    console.log(`[eatFood] ${foodItem.name}을(를) 발견했습니다. 먹기를 시도합니다.`);
    
    await bot.equip(foodItem, 'hand');
    
    await bot.consume();
    
    console.log(`[eatFood] ${foodItem.name}을(를) 먹었습니다. 현재 허기: ${bot.food}`);
    return true;
  } catch (err) {
    console.error('[eatFood] 음식을 먹는 중 오류 발생:', err);
    return false;
  }
}

module.exports = { eatFood };
