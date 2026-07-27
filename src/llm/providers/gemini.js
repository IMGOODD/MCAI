const { GoogleGenerativeAI } = require('@google/generative-ai');

function createGeminiProvider({ apiKey, model }) {
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

module.exports = { createGeminiProvider };
