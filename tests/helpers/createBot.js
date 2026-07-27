function createBot(overrides = {}) {
  return {
    food: 10,
    health: 20,
    version: '1.20.1',
    isBusy: true,
    chatMessages: [],
    chat(message) { this.chatMessages.push(message); },
    inventory: { items: () => [] },
    entity: { position: { x: 1.9, y: 64.2, z: -3.7 } },
    players: {},
    pathfinder: { setGoal(goal) { this.goal = goal; } },
    nearestEntity: () => null,
    findBlock: () => null,
    ...overrides
  };
}

module.exports = { createBot };
