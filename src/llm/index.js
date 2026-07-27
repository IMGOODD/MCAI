const { createOpenAIProvider } = require('./providers/openai');
const { createGeminiProvider } = require('./providers/gemini');

const PROVIDERS = {
  openai: createOpenAIProvider,
  gemini: createGeminiProvider
};

function resolveApiKey(settings) {
  const environmentVariable = settings.apiKeyEnv ||
    (settings.provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY');
  return process.env[environmentVariable] || settings.apiKey || null;
}

function createLlmClient(settings = {}) {
  const providerName = (settings.provider || 'openai').toLowerCase();
  const createProvider = PROVIDERS[providerName];
  if (!createProvider) {
    throw new Error(`Unsupported LLM provider: ${providerName}.`);
  }

  const defaults = providerName === 'gemini'
    ? { model: 'gemini-2.0-flash', apiKeyEnv: 'GEMINI_API_KEY' }
    : { model: 'gpt-5.4-mini', apiKeyEnv: 'OPENAI_API_KEY' };
  const resolvedSettings = { ...defaults, ...settings };

  return createProvider({
    ...resolvedSettings,
    apiKey: resolveApiKey(resolvedSettings)
  });
}

module.exports = { createLlmClient, resolveApiKey, PROVIDERS };
