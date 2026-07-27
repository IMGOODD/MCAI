function materialShortageMessage(itemName) {
  if (itemName === 'coal') return '석탄이 부족해.';
  if (itemName === 'raw_iron') return '철 광석이 부족해.';
  return null;
}

function shortageMessagesFromData(data = {}) {
  const messages = [];
  if (data.input && data.input.available < data.input.required) {
    const message = materialShortageMessage(data.input.name);
    if (message) messages.push(message);
  }
  if (data.fuel && data.fuel.available < data.fuel.required) {
    const message = materialShortageMessage(data.fuel.name);
    if (message) messages.push(message);
  }
  return [...new Set(messages)];
}

module.exports = { materialShortageMessage, shortageMessagesFromData };
