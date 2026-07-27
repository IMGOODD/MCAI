function normalizeTarget(target) {
  const map = {
    "나무": "log",
    "원목": "log",
    "목재": "log",
    "돌": "stone",
    "철": "iron_ingot"
  };

  return map[target] || target;
}

module.exports = {normalizeTarget};