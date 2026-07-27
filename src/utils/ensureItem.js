const { craftTool } = require('../actions/craft');
const inventoryUtil = require('../utils/inventory'); 

// Ensure a tool exists and is equipped.
async function ensureItem(bot, toolName) {
  const mcData = require('minecraft-data')(bot.version);
  const toolType = toolName.split('_')[1];

  const item = bot.inventory.items().find(i => i.name === toolName);

  if (item) {
    console.log(`[ensureItem] ${toolName}가 이미 인벤토리에 존재합니다. 장착을 시도합니다.`);
    try {
      await inventoryUtil.equipTool(bot, toolType);
      return true;
    } catch (err) {
      console.error(`[ensureItem] 기존 아이템 장착 실패:`, err);
      return false;
    }
  }

  console.log(`[ensureItem] ${toolName}가 없습니다. 제작을 시도합니다.`);
  try {
    const craftSuccess = await craftTool(bot, mcData, toolName);

    if (craftSuccess) {
      console.log(`[ensureItem] ${toolName} 제작 성공. 장착을 시도합니다.`);
      await inventoryUtil.equipTool(bot, toolType);
      return true;
    } else {
      console.log(`[ensureItem] ${toolName} 제작 실패 (재료 부족 또는 제작 불가).`);
      return false;
    }
  } catch (err) {
    console.error(`[ensureItem] 제작/장착 프로세스 중 오류 발생:`, err);
    return false;
  }
}

module.exports = { ensureItem };
