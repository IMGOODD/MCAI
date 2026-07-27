const { collectResource } = require('../actions/collect');
const { collectAllItems } = require('../actions/itemSearch'); 
const { normalizeTarget } = require('../utils/noramlize');
const resourceData = require("../data/resourceData");
const result = require('../utils/commandResult');
const { tossMatchingItems } = require('../actions/toss');
const { travelToEntityWithBoat } = require('../actions/boatTravel');

const RETURN_RESERVE_RESOURCES = new Set(['stone', 'dirt']);

function calculateReturnReserve(botPosition, playerPosition, buffer = 2) {
  if (!botPosition || !playerPosition) return 0;
  const verticalDistance = Math.max(0, Math.ceil(playerPosition.y - botPosition.y));
  return verticalDistance + (verticalDistance > 0 ? buffer : 0);
}

function shouldCollectReturnReserve(resourceType) {
  return RETURN_RESERVE_RESOURCES.has(resourceType);
}

module.exports = {
  name: 'collectCommand',
  async execute(bot, username, decision) {
    if (bot.isBusy) {
      bot.chat('지금은 다른 일을 하느라 바빠.');
      return result.failure('BOT_BUSY', { action: 'collect', resource: decision.target });
    }

    bot.isStopped = false;

    const resourceType = decision.target; 
    const targetCount = decision.count || 1;
    const resource = resourceData[resourceType];
    if (!resource) {
        bot.chat(`알 수 없는 자원이야: ${resourceType}`);
        return result.failure('RESOURCE_UNSUPPORTED', { resource: resourceType });
    }
    const itemDisplayName = resource.displayName;
    const master = bot.players[username]?.entity;
    if (!master) {
      bot.chat('너가 어디 있는지 보이지 않아 전달할 수 없어.');
      return result.failure('PLAYER_NOT_FOUND', { username });
    }
    

    bot.isBusy = true;
    const mcData = require('minecraft-data')(bot.version);

    bot.chat(`${itemDisplayName}을(를) 총 ${targetCount}개 채집하러 갈게.`);

    try {
      const gathered = await collectResource(bot, mcData, resourceType, targetCount);
      await bot.waitForTicks(10); 
      if(gathered === false || gathered < targetCount){
        return result.failure('RESOURCE_COLLECTION_INCOMPLETE', {
          resource: resourceType,
          requested: targetCount,
          acquired: gathered || 0
        });
      }

      // Reserve blocks needed to climb back to the player.
      const returnReserve = shouldCollectReturnReserve(resourceType)
        ? calculateReturnReserve(bot.entity.position, master.position)
        : 0;
      let reserveGathered = 0;
      if (returnReserve > 0 && !bot.isStopped) {
        console.log('[collectCommand] return reserve', {
          botY: bot.entity.position.y,
          playerY: master.position.y,
          requested: returnReserve
        });
        reserveGathered = await collectResource(bot, mcData, resourceType, returnReserve);
        if (reserveGathered === false) reserveGathered = 0;
      }
      if (bot.isStopped) return result.failure('COLLECTION_STOPPED', { resource: resourceType, acquired: gathered });

      bot.chat(`${itemDisplayName} ${gathered}개 채굴 완료!`);
      
      console.log('떨어진 아이템 확인 중');
      const target = normalizeTarget(decision.target);
      await collectAllItems(bot, target);
      
      console.log("아이템 검색 target:", target);
      
      const returned = await travelToEntityWithBoat(bot, master, 3);
      if (!returned) {
        return result.failure('RETURN_TO_PLAYER_FAILED', {
          resource: resourceType,
          acquired: gathered
        });
      }
      await bot.lookAt(master.position.offset(0, 1.6, 0));

      const deliveryCount = decision.deliveryCount || targetCount;
      const deliverableCount = bot.inventory.items()
        .filter(item => resource.tossMatcher(item.name))
        .reduce((sum, item) => sum + item.count, 0);

      console.log('[collectCommand] delivery decision', {
        resource: resourceType,
        requestedCollection: targetCount,
        requestedDelivery: deliveryCount,
        deliverableCount,
        returnReserve: reserveGathered
      });

      if (deliverableCount < deliveryCount) {
        bot.chat(`인벤토리에 가진 ${itemDisplayName}가 없어.`);
        return result.failure('RESOURCE_DELIVERY_INCOMPLETE', {
          resource: resourceType,
          requested: deliveryCount,
          available: deliverableCount
        });
      }
      const delivered = await tossMatchingItems(bot, resource.tossMatcher, deliveryCount);
      if (!delivered) {
        return result.failure('RESOURCE_DELIVERY_FAILED', {
          resource: resourceType,
          requested: deliveryCount
        });
      }
      bot.chat(`여기 캐온 ${itemDisplayName} ${deliveryCount}개 줬어.`);
      return result.success('RESOURCE_DELIVERED', {
        resource: resourceType,
        requested: targetCount,
        acquired: gathered,
        delivered: deliveryCount,
        returnReserve: reserveGathered
      });
      
    } catch (err) {
      console.error('채굴 프로세스 에러 : ', err);
      bot.chat('채집 도중 생각지 못한 에러가 났어.');

      return result.failure('RESOURCE_DELIVERY_FAILED', {
        resource: resourceType,
        requested: targetCount,
        error: err.message
      });
    } finally {
      bot.isBusy = false;
      bot.pathfinder.setGoal(null);
    }
    
  }
};

module.exports.calculateReturnReserve = calculateReturnReserve;
module.exports.shouldCollectReturnReserve = shouldCollectReturnReserve;

