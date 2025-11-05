const generateScript = require('./generateScriptFromEvent');
const textToSpeech = require('./textToSpeech');
const { QueueServiceClient } = require('@azure/storage-queue');

// Initialize Queue Client
const queueServiceClient = QueueServiceClient.fromConnectionString(
  process.env.AzureWebJobsStorage
);
const queueClient = queueServiceClient.getQueueClient('write-to-cosmos-queue');

// Export the orchestration logic as a function
async function createStoryOrchestration(requestBody, context) {
  const { eventName, eventYears, eventCategory, town, country } = requestBody;
  context.log('Received event:', eventName, eventYears, eventCategory, town, country);

  try {
    const script = await generateScript(eventName, eventYears, eventCategory, town, country);
    context.log('Generated script!');
    context.log('Event NAME:', eventName);
    
    const audioUrl = await textToSpeech(script, eventName);
    
    // Prepare data for queue message
    const newEvent = {
      eventDetails: {
        eventName,
        eventYears,
        eventCategory
      },
      addresses: [],
      media: {
        audioUrl,
        script
      },
      created: new Date().toISOString()
    };
    
    const sanitizedTown = town.toLowerCase().replace(/\s+/g, '-');
    const sanitizedCountry = country.toLowerCase().replace(/\s+/g, '-');
    
    const queueMessage = {
      id: sanitizedTown,
      partitionKey: sanitizedCountry,
      newEvent
    };
    
    // Enqueue the message (async, non-blocking)
    const messageBuffer = Buffer.from(JSON.stringify(queueMessage));
    const base64Message = messageBuffer.toString('base64');
    
    queueClient.sendMessage(base64Message)
      .then(() => context.log('Message successfully queued'))
      .catch(err => context.error('Error enqueueing message:', err));

    // Return response
    return { 
      status: 200, 
      jsonBody: { 
        event: eventName, 
        script, 
        audioUrl 
      } 
    };
    
  } catch (error) {
    context.error('Error during orchestration:', error);
    return { 
      status: 500, 
      jsonBody: { error: 'Something went wrong.', details: error.message } 
    };
  }
}

module.exports = { createStoryOrchestration };