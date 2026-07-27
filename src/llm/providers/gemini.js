const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_SETTINGS = {
  model: 'gemini-2.0-flash',
  apiKeyEnv: 'GEMINI_API_KEY'
};

function resolveSettings(settings = {}) {
  const resolved = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...resolved,
    apiKey: process.env[resolved.apiKeyEnv] || resolved.apiKey || null
  };
}

function create(settings = {}) {
  const { apiKey, model } = resolveSettings(settings);
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const client = new GoogleGenerativeAI(apiKey);

  return {
    name: 'gemini',
    async generateJson({ systemPrompt, userPrompt }) {
      const modelWithInstructions = client.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });
      const response = await modelWithInstructions.generateContent(userPrompt);
      return response.response.text();
    }
  };
}

module.exports = { create, resolveSettings, DEFAULT_SETTINGS };
