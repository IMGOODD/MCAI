const { goals: { GoalFollow } } = require('mineflayer-pathfinder');
const combatData = require('../data/combatData');
const { eatFood } = require('./eatFood');
const { enableComeWaterTraversal } = require('./come');
const {
  findHostileThreats,
  decideHostileResponse,
  handleHostileThreat
} = require('../core/combatManager');

function entityCoordinates(entity) {
  const position = entity?.position;
  if (!position) return null;
  return {
    x: Math.floor(position.x),
    y: Math.floor(position.y),
    z: Math.floor(position.z)
  };
}

async function fleeToCommander(bot, username, range = 3) {
  const player = bot.players?.[username]?.entity;
  if (!player || !bot.pathfinder) return false;
  enableComeWaterTraversal(bot);
  bot.pathfinder.setGoal(new GoalFollow(player, range), true);
  return true;
}

async function requestHelp(bot, username, threat, reason, options = {}) {
  const coordinates = entityCoordinates(threat) || entityCoordinates(bot.entity);
  const displayName = combatData.DISPLAY_NAMES[threat?.name] || threat?.name || '몬스터';
  const coordinateText = coordinates
    ? `${coordinates.x} ${coordinates.y} ${coordinates.z}`
    : '현재 위치';

  if ((bot.food ?? 20) < 20) await eatFood(bot);
  bot.chat(`${coordinateText}에 ${displayName}이(가) 있어. 지금은 못 잡겠어. 도와줘!`);
  const fled = await (options.flee || fleeToCommander)(bot, username);
  console.warn('[guard:help]', {
    reason,
    threat: threat?.name,
    coordinates,
    fledToCommander: fled
  });
  return {
    success: false,
    code: 'GUARD_HELP_REQUESTED',
    data: { reason, threat: threat?.name, coordinates, fledToCommander: fled }
  };
}

async function guardArea(bot, username, options = {}) {
  const config = { ...combatData.guard, ...options };
  const origin = options.origin?.clone?.() || options.origin || bot.entity?.position?.clone?.();
  const findThreats = options.findThreats || findHostileThreats;
  const decideResponse = options.decideResponse || decideHostileResponse;
  const handleThreat = options.handleThreat || handleHostileThreat;
  let defeated = 0;
  let cycles = 0;

  bot.isStopped = false;
  console.log('[guard:start]', { origin, radius: config.detectionRange });

  while (!bot.isStopped) {
    cycles += 1;
    const threats = findThreats(bot, config.detectionRange, { origin });
    if (threats.length > 0) {
      const decision = decideResponse(bot, threats, config);
      console.log('[guard:threat]', {
        count: threats.length,
        target: decision.target?.name,
        response: decision.type,
        reason: decision.reason
      });

      if (decision.type === 'retreat') {
        return requestHelp(bot, username, decision.target, decision.reason, options);
      }

      if (decision.type === 'fight') {
        const combatResult = await handleThreat(bot, {
          ...config,
          origin,
          names: [decision.target.name]
        });
        if (combatResult.success) {
          defeated += 1;
        } else if (!['NO_HOSTILE_THREAT', 'DEFENSE_BUSY'].includes(combatResult.code)) {
          return requestHelp(
            bot,
            username,
            decision.target,
            combatResult.code,
            options
          );
        }
      }
    }

    if (config.maxCycles && cycles >= config.maxCycles) break;
    const scanTicks = config.scanIntervalTicks || 10;
    if (typeof bot.waitForTicks === 'function') await bot.waitForTicks(scanTicks);
    else await new Promise(resolve => setTimeout(resolve, scanTicks * 50));
  }

  bot.pathfinder?.setGoal(null);
  return {
    success: true,
    code: bot.isStopped ? 'GUARD_STOPPED' : 'GUARD_SCAN_LIMIT',
    data: { radius: config.detectionRange, defeated, cycles }
  };
}

module.exports = {
  entityCoordinates,
  fleeToCommander,
  requestHelp,
  guardArea
};
