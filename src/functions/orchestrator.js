const { app } = require('@azure/functions');
const generateScript = require('./generateScriptFromEvent');
const textToSpeech = require('./textToSpeech');

app.http('orchestrator', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    const { eventName, eventYears, eventCategory, town } = await req.json();
    console.log('Received event:', eventName, eventYears, eventCategory, town);

    if (!eventName) {
        context.log('Missing town in request body');
      return { status: 400, body: 'Missing town.' };
    }

    try {
      // const events = await getEvents(town);
      // const randomEvent = events[Math.floor(Math.random() * events.length)];
      const script = await generateScript(eventName, eventYears, eventCategory, town);
      console.log('Generated script!   ');
      console.log('Script:', Object.prototype.toString.call(script));
      console.log('Event NAME :', eventName);
      const audioUrl = await textToSpeech(script, eventName);
      // console.log('Audio URL generated:', audioUrl);

      return { status: 200, jsonBody: { event: eventName, script, audioUrl } };
    } catch (error) {
      context.error('Error during orchestration:', error);
      return { status: 500, body: 'Something went wrong.' };
    }
  },
});
