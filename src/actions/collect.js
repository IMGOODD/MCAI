const { goals: { GoalGetToBlock } } = require('mineflayer-pathfinder');
const inventoryUtil = require('../utils/inventory');
const resourceData = require('../data/resourceData');
const { collectAllItems } = require('./itemSearch');
const { ensureSafety, waitUntilSafe } = require('./ensureSafety');

// Check whether the inventory contains a pickaxe that can mine this resource.
function hasRequiredPickaxe(bot, resourceType) {
  const items = bot.inventory.items().map(i => i.name);
  
  if (resourceType === 'iron') {
    // Iron requires at least a stone pickaxe.
    const validPickaxes = ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
    return items.some(name => validPickaxes.includes(name));
  }
  
  if (resourceType === 'diamond') {
    // Diamond requires at least an iron pickaxe.
    const validPickaxes = ['iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
    return items.some(name => validPickaxes.includes(name));
  }
  
  return true;
}


function isWaterBlock(block) {
  return ['water', 'flowing_water', 'bubble_column'].includes(block?.name);
}

function isUnsafeWaterTarget(bot, block) {
  if (!block?.position || typeof bot.blockAt !== 'function') return false;
  return isWaterBlock(block) || isWaterBlock(bot.blockAt(block.position.offset(0, 1, 0)));
}

function isToolMandatory(resource) {
  return Boolean(resource?.tool && resource.minTier !== 'hand');
}

function isExposedBlock(bot, block) {
  if (!block?.position || typeof bot.blockAt !== 'function') return false;
  const faces = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1]
  ];
  return faces.some(([x, y, z]) => {
    const neighbor = bot.blockAt(block.position.offset(x, y, z));
    return neighbor?.boundingBox === 'empty' && !isWaterBlock(neighbor);
  });
}

async function recoverFromWater(bot, resourceType) {
  if (!bot.entity?.isInWater) return true;

  console.warn(`[collectResource] water detected; escaping before collecting (${resourceType})`);
  let safetyResult = false;
  if (bot.isSafetyActive) {
    await waitUntilSafe(bot);
    safetyResult = !bot.entity?.isInWater;
  } else {
    safetyResult = await ensureSafety(bot, 'water_before_collection');
  }
  await waitUntilSafe(bot);

  const recovered = safetyResult && !bot.entity?.isInWater;
  console.log('[collect:water-recovery]', {
    resourceType,
    safetyResult,
    recovered,
    botPosition: bot.entity?.position
  });
  return recovered;
}

async function collectResource(bot, mcData, resourceType, targetCount, expectedItem = null) {
  let minedCount = 0;
  let currentCount = 0;
  let attempts = 0;
  
  const lowerResource = resourceType.toLowerCase();
  const resource = resourceData[lowerResource];
  if(!resource){
    console.warn(`[collectResource] unsupported resource: ${resourceType}`);
    bot.chat(`${resourceType}은(는) 아직 채집 방법을 몰라.`);
    return false;
  }
  
  const pickupMatcher = expectedItem
    ? name => name === expectedItem
    : resource.tossMatcher;
  const beforeCount = inventoryUtil.getItemCount(bot, pickupMatcher);
  console.log('[collect:start]', {
    resourceType,
    expectedItem,
    targetCount,
    beforeCount,
    botPosition: bot.entity?.position
  });
  

  if(resource.tool){
    if (resource.minTier !== "hand"){
      const hasTool = await inventoryUtil.hasRequiredTool(bot, resource.tool, resource.minTier);
      if(!hasTool){
        bot.chat("채집에 알맞은 장비가 없어")
        return false;
      }
    }
  }

  const expectedBlockMatcher = expectedItem === 'cobblestone'
    ? name => name === 'stone'
    : expectedItem === 'cobbled_deepslate'
      ? name => name === 'deepslate'
      : expectedItem?.endsWith('_log')
        ? name => name === expectedItem
      : resource.blockMatcher;
  const  targetBlockIds = mcData.blocksArray.filter(block =>
    expectedBlockMatcher(block.name)
  )
  .map(block => block.id);
  console.log('[collect:block-types]', {
    resourceType,
    blockIds: targetBlockIds
  });
  if(targetBlockIds.length === 0){
    bot.chat("채집할 블록 정보를 찾지 못했어.");
    return false;
  }

  // Count collected items from the inventory, not from broken blocks.
  while(currentCount < targetCount && attempts < targetCount + 5){
    if (bot.isCombatActive) {
      console.log('[collect:paused]', { reason: 'hostile_combat', resourceType });
      await bot.waitForTicks(2);
      continue;
    }
    if (bot.isSafetyActive) await waitUntilSafe(bot);
    if (bot.isStopped) {
      console.log(`[collectResource] stopped before collecting ${resourceType}`);
      break;
    }
    if (bot.entity?.isInWater) {
      bot.pathfinder.setGoal(null);
      if (!await recoverFromWater(bot, resourceType)) break;
      continue;
    }
    attempts++;
    const targetBlock = bot.findBlock({
      matching: block => targetBlockIds.includes(block.type) && !isUnsafeWaterTarget(bot, block),
      maxDistance : 64
    });

    console.log('[collect:search]', {
      attempt: attempts,
      found: Boolean(targetBlock),
      block: targetBlock?.name,
      position: targetBlock?.position,
      acquired: currentCount,
      targetCount
    });

    if (!targetBlock) {
      bot.chat(`주변에서 더 이상 ${resourceType}을(를) 찾을 수 없어.`);
      break;
    }

    try {
      console.log('[collect:move]', {
        block: targetBlock.name,
        position: targetBlock.position
      });
      if (resource.tool) {
        const equipped = await inventoryUtil.equipTool(
          bot,
          resource.tool,
          resource.minTier
        );
        console.log('[collect:equip]', {
          requestedTool: resource.tool,
          required: isToolMandatory(resource),
          equipped,
          heldItem: bot.heldItem?.name || null
        });
        if (!equipped && isToolMandatory(resource)) {
          console.warn('[collect:tool-decision]', {
            resourceType,
            tool: resource.tool,
            minTier: resource.minTier,
            decision: 'stop',
            reason: 'required_tool_missing'
          });
          break;
        }
        if (!equipped) {
          console.log('[collect:tool-decision]', {
            resourceType,
            tool: resource.tool,
            minTier: resource.minTier,
            decision: 'continue_with_hand',
            reason: 'tool_optional'
          });
        }
      }

      // Allow digging only while approaching an underground target.
      const movements = bot.pathfinder.movements;
      const previousCanDig = movements?.canDig;
      if (movements) movements.canDig = true;
      try {
        await bot.pathfinder.goto(new GoalGetToBlock(
          targetBlock.position.x,
          targetBlock.position.y,
          targetBlock.position.z
        ));
      } finally {
        if (movements) movements.canDig = previousCanDig;
      }
      bot.pathfinder.setGoal(null);
      console.log('[collect:arrived]', {
        botPosition: bot.entity?.position,
        stopped: Boolean(bot.isStopped),
        safetyActive: Boolean(bot.isSafetyActive),
        inWater: Boolean(bot.entity?.isInWater)
      });
      if (bot.isStopped) break;

      if (bot.entity?.isInWater || isUnsafeWaterTarget(bot, targetBlock)) {
        console.warn(`[collectResource] dig skipped: unsafe water target ${targetBlock.name}`);
        if (bot.entity?.isInWater && await recoverFromWater(bot, resourceType)) continue;
        console.log('[collect:water-target-skipped]', {
          resourceType,
          block: targetBlock.name,
          position: targetBlock.position
        });
        continue;
      }

      if (bot.canDigBlock(targetBlock)) {
        try {
          console.log('[collect:dig]', {
            block: targetBlock.name,
            position: targetBlock.position,
            tool: resource.tool
          });
          await bot.dig(targetBlock);
          if (bot.isStopped) break;
          minedCount++;
          await collectAllItems(bot, lowerResource, { maxAttempts: 4 });
          await bot.waitForTicks(5);
          currentCount = inventoryUtil.getItemCount(bot, pickupMatcher) - beforeCount;
          console.log('[collect:progress]', {
            minedCount,
            acquired: currentCount,
            targetCount,
            inventoryCount: beforeCount + currentCount
          });
          

        } catch (digError) {
          if (digError.message === 'Digging aborted') {
            if (bot.isStopped) {
              console.log(`[collectResource] digging stopped by command: ${targetBlock.name}`);
              break;
            }
            console.warn(`[경고] 블록(${targetBlock.name}) 채굴 중단 감지. 다음 블록으로 넘어갑니다.`);
            await bot.waitForTicks(10);
            continue;
          } else {
            throw digError;
          }
        }
      } else {
        bot.chat('이 블록은 캘 수 없어.');
        break;
      }
    } catch (gotoError) {
      if (bot.isSafetyActive) await waitUntilSafe(bot);
      if (!bot.isStopped && !bot.entity?.isInWater && gotoError.message === 'Path was reset') {
        console.log(`[collectResource] movement reset by safety action; retrying ${resourceType}`);
        continue;
      }
      if (bot.isStopped) {
        console.log(`[collectResource] movement stopped by command: ${resourceType}`);
        break;
      }
      console.error('목표 블록으로 이동 중 오류 발생 : ', gotoError.message);
      await bot.waitForTicks(10);
      continue;
    }
    
  }
  console.log('[collect:finish]', {
    resourceType,
    minedCount,
    acquired: currentCount,
    targetCount,
    stopped: Boolean(bot.isStopped)
  });
  return currentCount;
}

module.exports = {
  collectResource,
  isWaterBlock,
  isUnsafeWaterTarget,
  isExposedBlock,
  isToolMandatory,
  recoverFromWater
};
