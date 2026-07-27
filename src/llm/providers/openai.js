const { OpenAI } = require('openai');

const DEFAULT_SETTINGS = {
  model: 'gpt-5.4-mini',
  apiKeyEnv: 'OPENAI_API_KEY'
};

function resolveSettings(settings = {}) {
  const resolved = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...resolved,
    apiKey: process.env[resolved.apiKeyEnv] || resolved.apiKey || null
  };
}

function create(settings = {}) {
  const { apiKey, baseURL, model } = resolveSettings(settings);
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  return {
    name: 'openai',
    async generateJson({ systemPrompt, userPrompt }) {
      const response = await client.responses.create({
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        text: { format: { type: 'json_object' } },
        temperature: 0.1
      });

      return response.output_text;
    }
  };
}

module.exports = { create, resolveSettings, DEFAULT_SETTINGS };
