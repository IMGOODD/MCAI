const { goals: { GoalFollow, GoalNear } } = require('mineflayer-pathfinder');

const WATER_BLOCKS = ['water', 'flowing_water', 'bubble_column'];

function enableComeWaterTraversal(bot, options = {}) {
  bot._restoreComeWaterTraversal?.();

  const movements = bot.pathfinder?.movements;
  if (!movements) return () => {};

  const previousLiquidCost = movements.liquidCost;
  const removedWaterIds = [];
  movements.liquidCost = options.liquidCost || 8;

  for (const blockName of WATER_BLOCKS) {
    const blockId = bot.registry?.blocksByName?.[blockName]?.id;
    if (blockId != null && movements.blocksToAvoid?.has(blockId)) {
      movements.blocksToAvoid.delete(blockId);
      removedWaterIds.push(blockId);
    }
  }

  let restored = false;
  let timeout = null;
  const restore = () => {
    if (restored) return;
    restored = true;
    movements.liquidCost = previousLiquidCost;
    for (const blockId of removedWaterIds) movements.blocksToAvoid?.add(blockId);
    if (timeout) clearTimeout(timeout);
    bot.removeListener?.('goal_reached', restore);
    bot.removeListener?.('death', restore);
    bot.removeListener?.('end', restore);
    if (bot._restoreComeWaterTraversal === restore) {
      bot._restoreComeWaterTraversal = null;
    }
    console.log('[come:water-traversal-restored]', {
      liquidCost: movements.liquidCost,
      restoredWaterBlocks: removedWaterIds.length
    });
  };

  bot._restoreComeWaterTraversal = restore;
  bot.once?.('goal_reached', restore);
  bot.once?.('death', restore);
  bot.once?.('end', restore);
  timeout = setTimeout(restore, options.maxDurationMs || 120000);
  timeout.unref?.();

  console.log('[come:water-traversal-enabled]', {
    liquidCost: movements.liquidCost,
    allowedWaterBlocks: removedWaterIds.length
  });
  return restore;
}

function parseCoordinates(target) {
  if (!target) return null;

  if (typeof target === 'object' && !Array.isArray(target)) {
    const coordinates = { x: Number(target.x), y: Number(target.y), z: Number(target.z) };
    return Object.values(coordinates).every(Number.isFinite) ? coordinates : null;
  }

  const values = Array.isArray(target)
    ? target
    : String(target).trim().split(/[\s,]+/);
  if (values.length !== 3) return null;

  const [x, y, z] = values.map(Number);
  return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
}

  
async function comeToMe(bot, username) {

  const target = bot.players[username]?.entity;
  
  if (!target) {
    bot.chat('너가 어디 있는지 보이지 않아.');
    return false;
  }

  bot.chat('지금 갈게!');

  const range = 3;

  const resume = () => bot.pathfinder.setGoal(new GoalFollow(target, range), true);
  bot._activeTravelTarget = {
    mode: 'player',
    range,
    getPosition: () => target?.position,
    resume
  };
  const activeTravel = bot._activeTravelTarget;
  bot.once?.('goal_reached', () => {
    if (bot._activeTravelTarget === activeTravel) bot._activeTravelTarget = null;
  });
  const restoreMovement = enableComeWaterTraversal(bot);
  try {
    resume();
  } catch (error) {
    restoreMovement();
    throw error;
  }
  return true;
}

async function comeToCoordinates(bot, coordinates, range = 3) {
  const target = parseCoordinates(coordinates);
  if (!target) {
    console.warn('[come] invalid coordinates:', coordinates);
    return false;
  }

  console.log('[come:coordinates]', {
    from: bot.entity?.position,
    to: target,
    range
  });
  bot.chat(`${target.x}, ${target.y}, ${target.z} 좌표로 갈게!`);
  const resume = () =>
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, range), false);
  bot._activeTravelTarget = {
    mode: 'coordinates',
    range,
    getPosition: () => target,
    resume
  };
  const activeTravel = bot._activeTravelTarget;
  bot.once?.('goal_reached', () => {
    if (bot._activeTravelTarget === activeTravel) bot._activeTravelTarget = null;
  });
  const restoreMovement = enableComeWaterTraversal(bot);
  try {
    resume();
  } catch (error) {
    restoreMovement();
    throw error;
  }
  return true;
}

module.exports = {
  comeToMe,
  comeToCoordinates,
  parseCoordinates,
  enableComeWaterTraversal
};
