const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database("Main_DB");
const container = database.container("Data-Container");

app.storageQueue('eventCosmosWriter', {
  queueName: 'myqueuename',
  connection: 'AzureWebJobsStorage',
  handler: async (queueItem, context) => {
    try {
      const msg = typeof queueItem === 'string'
        ? JSON.parse(queueItem)
        : queueItem;
      const { id, partitionKey, newEvent } = msg;
      if (!id || !partitionKey || !newEvent) {
        throw new Error('Invalid message format');
      }

      // Try to append newEvent
      try {
        const ops = [{ op: 'add', path: '/events/-', value: newEvent }];
        await container
          .item(id, partitionKey)
          .patch(ops);

        context.log(`Appended event to existing document ${id}`);
      } catch (patchErr) {
        // If it fails because events doesn't exist, create the array with one element
        if (patchErr.code === 400) {
          context.log(`Array 'events' missing; initializing for document ${id}`);
          await container
            .item(id, partitionKey)
            .patch([{ op: 'add', path: '/events', value: [newEvent] }]);

          context.log(`Initialized 'events' with one event for document ${id}`);
        } else if (patchErr.code === 404) {
          // Document missing entirely—create new document
          context.log(`Document ${id} not found. Creating new with event.`);
          const newDoc = {
            id,
            partitionKey,
            town: id.replace(/-/g, ' '),
            events: [newEvent]
          };
          await container.items.create(newDoc);
        } else {
          throw patchErr;
        }
      }
    } catch (err) {
      context.error(`Error processing queue item: ${err.message}`);
      throw err;  // so queue message is retried
    }
  }
});
