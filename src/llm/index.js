const openaiProvider = require('./providers/openai');
const geminiProvider = require('./providers/gemini');

const PROVIDERS = {
  openai: openaiProvider,
  gemini: geminiProvider
};

function createLlmClient(settings = {}) {
  const providerName = (settings.provider || 'openai').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${providerName}.`);
  }

  return provider.create(settings);
}

module.exports = { createLlmClient, PROVIDERS };
