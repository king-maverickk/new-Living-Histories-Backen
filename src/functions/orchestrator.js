const { app } = require('@azure/functions');
const generateScript = require('./generateScriptFromEvent');
const textToSpeech = require('./textToSpeech');
const { QueueClient, QueueServiceClient } = require('@azure/storage-queue');

// Initialize Queue Client - using v4 programming model
const queueServiceClient = QueueServiceClient.fromConnectionString(
  process.env.AzureWebJobsStorage
);
const queueClient = queueServiceClient.getQueueClient('myqueuename');

app.http('orchestrator', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    // add country
    const { eventName, eventYears, eventCategory, town, country } = await req.json();
    context.log('Received event:', eventName, eventYears, eventCategory, town, country);

    if (!eventName) {
      context.log('Missing town in request body');
      return { status: 400, body: 'Missing town.' };
    }

    try {
      // add country here
      const script = await generateScript(eventName, eventYears, eventCategory, town, country);
      context.log('Generated script!');
      context.log('Event NAME:', eventName);
      const audioUrl = await textToSpeech(script, eventName);
      
      // Prepare data for queue message - for array-based approach with town as key
      // Create a new event object to be added to the array
      const newEvent = {
        eventDetails: {
          eventName,
          eventYears,
          eventCategory
        },
        addresses: [], // You could extract addresses from script if needed
        media: {
          audioUrl,
          script
        },
        created: new Date().toISOString()
      };
      
      // For array-based approach, using town as document ID and partitionKey
      const sanitizedTown = town.toLowerCase().replace(/\s+/g, '-');
      // sanitise country here too
      const sanitizedCountry = country.toLowerCase().replace(/\s+/g, '-');
      const queueMessage = {
        id: sanitizedTown, // Using town as document ID
        partitionKey: sanitizedCountry, // Using country* as partition key
        newEvent // The event to append to the array
      };
      // context.log('Queue message prepared:', queueMessage);
      
      // Enqueue the message (async, non-blocking)
      try {
        // Convert message to base64 string for queue storage
        const messageBuffer = Buffer.from(JSON.stringify(queueMessage));
        const base64Message = messageBuffer.toString('base64');
        // context.log('Queue message prepared:', base64Message);
        
        // Send message to queue (don't await to keep response fast)
        queueClient.sendMessage(base64Message)
          .then(() => context.log('Message successfully queued'))
          .catch(err => context.error('Error enqueueing message:', err));
          
        // Note: We're not awaiting the queue operation to keep the HTTP response fast
      } catch (queueError) {
        // Log error but don't fail the HTTP response
        context.error('Error preparing queue message:', queueError);
      }

      // Return response to user immediately
      return { status: 200, jsonBody: { event: eventName, script, audioUrl } };
    } catch (error) {
      context.error('Error during orchestration:', error);
      return { status: 500, body: 'Something went wrong.' };
    }
  },
});
