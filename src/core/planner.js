const craftingPlanner = require('./planners/craftingPlanner');
const collectionPlanner = require('./planners/collectionPlanner');
const farmingPlanner = require('./planners/farmingPlanner');
const huntingPlanner = require('./planners/huntingPlanner');
const storagePlanner = require('./planners/storagePlanner');
const smeltingPlanner = require('./planners/smeltingPlanner');
const equipmentPlanner = require('./planners/equipmentPlanner');
const dragonPlanner = require('./planners/dragonPlanner');

const domainPlanners = [
  dragonPlanner,
  equipmentPlanner,
  smeltingPlanner,
  craftingPlanner,
  collectionPlanner,
  farmingPlanner,
  huntingPlanner,
  storagePlanner
];

function createPlan(bot, task, options = {}) {
  console.log('[planner:route]', { action: task?.action, target: task?.target });

  const planner = domainPlanners.find(candidate => candidate.canHandle(task));
  if (!planner) {
    console.log('[planner:route]', { domain: 'passthrough' });
    return [task];
  }

  console.log('[planner:route]', { domain: planner.domain });
  return planner.createPlan(bot, task, options);
}

module.exports = {
  createPlan,
  domainPlanners,
  hasPickaxeAtLeast: craftingPlanner.hasPickaxeAtLeast,
  itemCount: craftingPlanner.itemCount,
  UnsupportedMaterialError: craftingPlanner.UnsupportedMaterialError,
  recipeIngredients: craftingPlanner.recipeIngredients,
  requiresTable: craftingPlanner.requiresTable
};
