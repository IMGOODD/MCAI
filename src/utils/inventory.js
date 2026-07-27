const {toolPriority, tierOrder} = require("../data/toolpriority");

  // Equip the highest-tier tool that satisfies the requested minimum tier.
  async function equipTool(bot, toolType, minTier = null) {

    const tools = bot.inventory.items().filter(item => {
      // Do not treat a pickaxe as an axe.
      if (toolType === 'axe' && item.name.includes('pickaxe')) {
        return false; 
      }
      return item.name.endsWith(`_${toolType}`);
    });
    
    const minimumIndex = minTier && minTier !== 'hand'
      ? tierOrder.indexOf(minTier)
      : -1;
    const allowedMaterials = minimumIndex >= 0
      ? new Set(tierOrder.slice(minimumIndex))
      : null;
    let bestTool = null;

    for (const material of toolPriority){
      if (allowedMaterials && !allowedMaterials.has(material)) continue;
      bestTool = tools.find(tool => tool.name === `${material}_${toolType}`);

      if (bestTool) break;
    }

    if(!bestTool) return false;

    await bot.equip(bestTool, "hand");
    return true;
  };

async function hasRequiredTool(bot, toolType, minTier){

  if (minTier === "hand") return true;

  const start = tierOrder.indexOf(minTier);
  for (let i = start; i < tierOrder.length; i++){
    const material = tierOrder[i];

    const tool = bot.inventory.items().find(item => 
      item.name === `${material}_${toolType}`
    );
    if(tool) return true;
  }
  return false;
}

function getItemCount(bot, matcher){
  return bot.inventory.items().filter(item => matcher(item.name)).reduce((sum, item) => sum+item.count,0);
}
  module.exports = { equipTool, hasRequiredTool, getItemCount}

