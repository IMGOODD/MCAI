const { goals: { GoalFollow } } = require('mineflayer-pathfinder');

async function approachPlayer(bot, username, range = 5) {
  const player = bot.players[username]?.entity;
  if (!player) return false;

  await bot.pathfinder.goto(new GoalFollow(player, range));
  await bot.lookAt(player.position.offset(0, 1.6, 0));
  return true;
}

module.exports = { approachPlayer };
