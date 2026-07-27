const resourceData = {
     log: {
    displayName: "나무",
    tool: "axe",
    minTier: "hand",
    blockMatcher: name => name.endsWith("_log"),
    tossMatcher: name => name.endsWith("_log")
  },

  stone: {
    displayName: "돌",
    tool: "pickaxe",
    minTier: "wooden",
    blockMatcher : name =>
      name === "stone" || name === "deepslate",
    tossMatcher : name => [
      "stone",
      "cobblestone",
      "cobbled_deepslate"
    ].includes(name)    
  },

  dirt: {
    displayName: "흙",
    tool: "shovel",
    minTier: "hand",
    blockMatcher: name =>
      name === "dirt" || name === "grass_block",
    tossMatcher: name =>
      name === "dirt"
  },

  coal: {
    displayName: "석탄",
    tool: "pickaxe",
    minTier: "wooden",
    blockMatcher: name =>
      name === "coal_ore" ||
      name === "deepslate_coal_ore",
    tossMatcher: name =>
      name === "coal"
  },

  iron: {
    displayName: "철",
    tool: "pickaxe",
    minTier: "stone",
    blockMatcher: name =>
      name === "iron_ore" ||
      name === "deepslate_iron_ore",
    tossMatcher: name =>
      name === "raw_iron"
  },

  diamond: {
    displayName: "diamond",
    tool: "pickaxe",
    minTier: "iron",
    blockMatcher: name =>
      name === "diamond_ore" || name === "deepslate_diamond_ore",
    tossMatcher: name =>
      name === "diamond"
  }
};

module.exports = resourceData;
