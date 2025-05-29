const { AzureOpenAI } = require('openai');

const client = new AzureOpenAI({
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-05-01-preview',
});

module.exports = client;
