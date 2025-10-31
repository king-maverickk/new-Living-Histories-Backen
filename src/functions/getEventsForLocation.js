const { client, deployment } = require('../utils/openaiClient');

module.exports = async function getEventsFromLocation(location, country) {
  const prompt = `Generate a list of events or cultural and/or political happenings in ${location}, ${country} in the last 80 years. Display it like EVENT - TIME_PERIOD - CATEGORY. Return only the list. Don't number the events.`;

  try {
    const response = await client.chat.completions.create({
      model: deployment, // from env via client file
      messages: [
        { role: 'system', content: 'You are a factual historian.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('No response content');

    const eventsArray = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return eventsArray;
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return [];
  }
};
