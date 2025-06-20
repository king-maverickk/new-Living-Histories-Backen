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
    // Parse the queue item as JSON
    try {
      msg = typeof queueItem === 'string' ? JSON.parse(queueItem) : queueItem; 
    } catch (err) {
      context.log('Invalid queue message JSON:', err.message);
      return;
    }

    const { id, partitionKey, newEvent } = msg;
    if (!id || !partitionKey || !newEvent) {
      context.log('Missing id, partitionKey, or newEvent in message');
      return;
    }

    // Extract script from newEvent (if any)
    const script = newEvent.media?.script || '';

    context.log(`Processing event for id: ${id}, partitionKey: ${partitionKey}`);
    try {
      // 1. Write the new event
      await patchNewEvent(container, id, partitionKey, newEvent, context);
      context.log('✅ patchNewEvent completed');

      // 2. Get the index of the newly‐added event in the document
      const eventIndex = await getEventIndex(container, id, partitionKey, context);
      context.log(`✅ Got event index: ${eventIndex}`);

      // 3. Extract addresses from the script and geocode them
      const addresses = await extractAddresses(script, context);
      const geocoded = await geocodeAll(addresses, context);
      context.log(`Extracted ${addresses.length} addresses, geocoded ${geocoded.length}`);

      // 4. If any geocodes were found, patch them into Cosmos
      if (geocoded.length > 0) {
        await patchAddresses(container, id, partitionKey, eventIndex, geocoded, context);
        context.log('✅ patchAddresses completed');
      }

      context.log('Write and geocode processing completed successfully');
    } catch (err) {
      context.log('[ERROR] Processing failed:', err.message);
    }
  }
});
