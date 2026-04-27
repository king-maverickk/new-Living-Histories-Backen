# Local Development Guide - AI-Powered Historical Podcast Generator

This document outlines the steps required to set up a local development environment for the AI-Powered Historical Podcast Generator. This setup utilizes local emulators for Azure Cosmos DB and Azure Storage to ensure safe building, testing, and feature refactoring before deploying changes to the cloud.

## Prerequisites

Before starting, ensure you have the following installed:
* **Node.js**: Version 20 or later is required.
* **Azure Functions Core Tools**: Necessary for running the function app locally.
* **Azurite**: Emulates Azure Blob Storage and Azure Queue Storage locally.
* **Azure Cosmos DB Emulator**: Provides a local environment emulating the Cosmos DB service.

---

## 1. Install Azure Functions Core Tools

The Azure Functions Core Tools provide a local development experience for creating, testing, and debugging Azure Functions.

You can install it via npm:
```bash
npm i -g azure-functions-core-tools 
```

## 2. Set Up Emulators

This application relies on Azure Queue Storage for decoupled processing, Azure Blob Storage for audio hosting, and Azure Cosmos DB for data persistence. Local emulators allow you to test these services without affecting production data.

### Azurite (Blob & Queue Storage Emulator)

Azurite will handle the local emulation for both the `myqueuename` queue and the `podcasts-audio` blob container.

**Option A: VS Code Extension (Recommended)**

1. Install the Azurite extension in VS Code.

2. Find "**[Azurite Blob Service]**" at the bottom of the VS Code window and click it. A pop-up will appear confirming Azurite is running, and a "hidden folder" will appear at the project root folder.


**Option B: CLI**

Install via npm:
```bash
npm i -g azure-functions-core-tools@4 
```

Run Azurite:
```bash
azurite --silent --location ./azurite-data --debug ./azurite-data/debug.log
```

### Azure Cosmos DB Emulator

The application stores historical events in a Cosmos DB container named `Living-Histories-Container` within the `Living-Histories-DB` database.

1. Download and install the [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator)

2. Start the emulator. It will open a local portal (usually `https://localhost:8081/_explorer/index.html`).

3. Copy the **Primary Connection String**, **URI**, and **Primary Key** from the emulator portal for your `local.settings.json`.

4. In the emulator portal, manually create the `Living-Histories-DB` database and the `Living-Histories-Container` container.

5. Ensure the container is configured with `/partitionKey` as the partition key.


## 3. Configure local.settings.json

The application requires specific environment variables to connect to Azure OpenAI, Azure Cognitive Services, and the Google Geocoding API.

Open the `local.settings.json` file in the root of your project and populate it with the following configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "BLOB_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "COSMOS_DB_ENDPOINT": "https://localhost:8081/",
    "COSMOS_DB_KEY": "<PASTE_LOCAL_COSMOS_EMULATOR_KEY_HERE>",
    "AZURE_OPENAI_ENDPOINT": "<PASTE_YOUR_AZURE_OPENAI_ENDPOINT>",
    "AZURE_OPENAI_API_KEY": "<PASTE_YOUR_AZURE_OPENAI_API_KEY>",
    "OPENAI_ASSISTANT_ID": "<PASTE_YOUR_ASSISTANT_ID>",
    "TTS_ENDPOINT": "<PASTE_YOUR_TTS_ENDPOINT>",
    "TTS_KEY": "<PASTE_YOUR_TTS_KEY>",
    "GOOGLE_GEOCODING_API_KEY": "<PASTE_YOUR_GOOGLE_MAPS_API_KEY>"
  }
}
```

*Note: `UseDevelopmentStorage=true` routes both `AzureWebJobsStorage` (for the queue connection) and `BLOB_CONNECTION_STRING` (for blob uploads) to your running Azurite instance. The external API keys must be valid keys from your active Azure and Google Cloud accounts*

## 4. Running the Application Locally

Once your tools are installed, emulators are running, and local.settings.json is configured, you can start the function app.

1. Open your terminal in the root directory and install dependencies:

```bash
npm install
```

2. Start the local function host:

```bash
func start
```

The terminal will output the local URL for your `orchestrator` HTTP-triggered function. You can use tools like Postman or curl to send a `POST` request to the local `/api/orchestrator` endpoint with the required JSON body (`eventName`, `eventYears`, `eventCategory`, `town`, `country`) to test the full architectural workflow.

## 5. Deploying Changes via VS Code

When you are ready to push your refactored features to the cloud, you can deploy seamlessly using the VS Code Command Palette.

1. Open the Command Palette (**View > Command Palette**) OR (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Search for and select `Azure Functions: Deploy to Function App....`
3. Follow the prompts to select your Azure subscription and the specific Function App.

### Important Note on Environment Variables

Changing values in your `local.settings.json` file **does not** automatically change the environment variables (Application Settings) in your deployed Azure Function App.

- **Code vs. Settings:** The "Deploy to Function App..." command only packages and pushes your application code (JavaScript files, `package.json`, etc.). It deliberately ignores your `local.settings.json` to prevent accidentally overwriting production API keys or database connections with local emulator configurations.

- **Uploading Settings Explicitly:** If you add new environment variables and need to sync them to the cloud, you must explicitly push them using the **Azure Functions: Upload Local Settings...** command in the Command Palette, or add them manually in the Azure Portal's Application Settings.
