const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3').Vec3;

// Harvest mature wheat and replant it when seeds are available.
async function autoFarm(bot, maxDistance = 16) {
  const mcData = require('minecraft-data')(bot.version);

  // Metadata 7 represents mature wheat.
  const wheatBlock = bot.findBlock({
    matching: (block) => block.name === 'wheat' && block.metadata === 7,
    maxDistance: maxDistance
  });

  if (!wheatBlock) {
    console.log('[autoFarm] 수확할 수 있는 다 자란 밀이 주변에 없습니다.');
    return false;
  }

  try {
    const blockPos = wheatBlock.position;
    console.log(`[autoFarm] 다 자란 밀 발견 (${blockPos}). 이동을 시작합니다.`);

    await bot.pathfinder.goto(new goals.GoalLookAtBlock(blockPos, bot.world));

    console.log('[autoFarm] 밀을 수확합니다.');
    await bot.dig(wheatBlock);

    const seedItem = bot.inventory.items().find(item => item.name === 'wheat_seeds');
    if (!seedItem) {
      console.log('[autoFarm] 인벤토리에 심을 씨앗이 없어 재파종을 건너뜁니다.');
      return true;
    }

    const farmlandPos = blockPos.offset(0, -1, 0);
    const farmlandBlock = bot.blockAt(farmlandPos);

    if (!farmlandBlock || farmlandBlock.name !== 'farmland') {
      console.log('[autoFarm] 씨앗을 심을 경작지(farmland)를 찾지 못했습니다.');
      return true;
    }

    console.log(`[autoFarm] ${farmlandPos} 위치 경작지에 씨앗을 다시 심습니다.`);
    await bot.equip(seedItem, 'hand');
    
    await bot.placeBlock(farmlandBlock, new Vec3(0, 1, 0));
    console.log('[autoFarm] 수확 및 재파종 작업을 완료했습니다.');
    
    return true;

  } catch (err) {
    console.error('[autoFarm] 농사 진행 중 오류 발생:', err);
    bot.pathfinder.setGoal(null);
    return false;
  }
}

module.exports = { autoFarm };
