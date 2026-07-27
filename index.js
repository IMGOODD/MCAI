const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');
const config = require('./config.json');
const {
  configureDoorInteractions,
  registerDoorInteractionEvents
} = require('./src/actions/doorInteraction');

console.log('스크립트가 실행되었습니다.');

// Create the Minecraft bot.
const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  version: config.version
});

// Enable pathfinding movement.
bot.loadPlugin(pathfinder);

// Configure movement after the bot joins the server.
bot.once('spawn', () => {
  console.log('봇이 서버에 접속했습니다.');
  bot.chat("Hello World");

  const mcData = minecraftData(bot.version);
  const defaultMove = new Movements(bot, mcData);

  defaultMove.canDig = false;
  defaultMove.liquidCost = 100;
  defaultMove.infiniteLiquidDropdownDistance = false;
  for (const blockName of ['water', 'flowing_water', 'bubble_column']) {
    const block = mcData.blocksByName[blockName];
    if (block) defaultMove.blocksToAvoid.add(block.id);
  }
  configureDoorInteractions(bot, mcData, defaultMove);
  registerDoorInteractionEvents(bot);

  bot.pathfinder.setMovements(defaultMove);
});

// Register chat and runtime event handlers.
require('./src/events/chat')(bot);
require('./src/events/lifecycle')(bot);
require('./src/events/safety')(bot);
require('./src/events/defense')(bot);
require('./src/events/boatNavigation')(bot);
