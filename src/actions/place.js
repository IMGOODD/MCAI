const { Vec3 } = require('vec3');

function isWater(block) {
  return ['water', 'flowing_water', 'bubble_column'].includes(block?.name);
}

function isSafePlacementReference(bot, referenceBlock) {
  if (!referenceBlock?.position || referenceBlock.boundingBox !== 'block') return false;
  const destination = referenceBlock.position.offset(0, 1, 0);
  const destinationBlock = bot.blockAt(destination);
  if (!destinationBlock || destinationBlock.boundingBox !== 'empty' || isWater(destinationBlock)) return false;

  const waterChecks = [
    [0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [0, 1, 0], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]
  ];
  return waterChecks.every(([x, y, z]) => !isWater(bot.blockAt(destination.offset(x, y, z))));
}

function findSafePlacementReference(bot) {
  const origin = bot.entity.position.floored();
  for (let radius = 1; radius <= 3; radius++) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
        const reference = bot.blockAt(origin.offset(x, -1, z));
        if (isSafePlacementReference(bot, reference)) return reference;
      }
    }
  }
  return null;
}

async function placing(bot, blockName) {
  const item = bot.inventory.items().find(i => i.name === blockName);
  if (!item) {
    console.warn(`[place] missing item: ${blockName}`);
    return false;
  }
  if (bot.entity?.isInWater) {
    console.warn(`[place] refused underwater placement: ${blockName}`);
    return false;
  }

  const referenceBlock = findSafePlacementReference(bot);
  if (!referenceBlock) {
    console.warn(`[place] safe placement position not found: ${blockName}`);
    return false;
  }

  try {
    await bot.equip(item, 'hand');
    await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
    return true;
  } catch (error) {
    console.error(`[place] failed: ${blockName}`, error.message);
    return false;
  }
}

module.exports = { placing, isSafePlacementReference, findSafePlacementReference };
