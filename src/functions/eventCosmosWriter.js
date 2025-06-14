const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const patchNewEvent = require('../utils/patchNewEvent');
const getEventIndex = require('../utils/getEventIndex');
const extractAddresses = require('../utils/extractAddresses');
const geocodeAll = require('../utils/geocodeAll');
const patchAddresses = require('../utils/patchAddresses');

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY
});
const container = cosmosClient.database('Main_DB').container('Data-Container');

app.storageQueue('eventCosmosWriter', {
  queueName: 'myqueuename',
  connection: 'AzureWebJobsStorage',
  handler: async (queueItem, context) => {
    let msg;
    // Attempt to parse the queue item as JSON
    try {
      msg = typeof queueItem === 'string' ? JSON.parse(queueItem) : queueItem; 
    } catch (err) {
      context.log.error('Invalid queue message JSON:', err.message);
      return;
    }

    const { id, partitionKey, newEvent, script } = msg;
    if (!id || !partitionKey || !newEvent) {
      context.log.error('Missing required fields in message');
      return;
    }

    await patchNewEvent(container, id, partitionKey, newEvent, context);
    const eventIndex = await getEventIndex(container, id, partitionKey, context);

    const addresses = await extractAddresses(script, context);
    const geoResults = await geocodeAll(addresses, context);

    if (geoResults.length > 0) {
      await patchAddresses(container, id, partitionKey, eventIndex, geoResults, context);
    }
  }
});
