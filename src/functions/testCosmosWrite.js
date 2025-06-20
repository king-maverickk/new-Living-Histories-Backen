/*const { app } = require('@azure/functions');
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

app.http('testCosmosWrite', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const body = await request.json();

    // Validate required fields
    const { id, partitionKey, newEvent } = body;
    if (!id || !partitionKey || !newEvent) {
      return {
        status: 400,
        jsonBody: { error: 'Missing id, partitionKey, or newEvent' }
      };
    }

    const script = newEvent.media?.script || '';

    context.log(`Processing test write for id: ${id}, partitionKey: ${partitionKey}`);
    try {
      await patchNewEvent(container, id, partitionKey, newEvent, context);

      context.log('✅ patchNewEvent completed');

      const eventIndex = await getEventIndex(container, id, partitionKey, context);
      context.log(`✅ Got event index: ${eventIndex}`);
      
      const addresses = await extractAddresses(script, context);
      
      const geocoded = await geocodeAll(addresses, context);
      context.log(`Extracted ${addresses.length} addresses, geocoded ${geocoded.length}`);

      if (geocoded.length > 0) {
        await patchAddresses(container, id, partitionKey, eventIndex, geocoded, context);
      }

      return {
        status: 200,
        jsonBody: {
          message: 'Write and geocode test completed successfully',
          eventIndex,
          addressCount: geocoded.length
        }
      };

    } catch (err) {
      context.log('[ERROR] Test failed:', err.message);
      return {
        status: 500,
        jsonBody: { error: err.message }
      };
    }

  }
});
*/