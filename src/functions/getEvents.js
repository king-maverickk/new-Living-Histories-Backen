const { app } = require('@azure/functions');
const getEventsFromLocation = require('./getEventsForLocation');

app.http('getEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    context.log(`HTTP function processed request: ${req.url}`);

    const url = new URL(req.url);
    const location = url.searchParams.get('location');
    // use country here
    const country = url.searchParams.get('country')

    if (!location) {
      return {
        status: 400,
        body: 'Missing location parameter',
      };
    }
    if (!country) {
      return {
        status: 400,
        body: 'Missing country parameter',
      };
    }

    try {
      const events = await getEventsFromLocation(location, country);
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      };
    } catch (err) {
      context.error(`Error generating events for ${location}: ${err.message}`);
      return {
        status: 500,
        body: `Internal server error: ${err.message}`,
      };
    }
  },
});
