const { AzureOpenAI } = require('openai');

const client = new AzureOpenAI({
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-05-01-preview',
});

// Optional: also export the deployment name for reuse
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

module.exports = { client, deployment };
