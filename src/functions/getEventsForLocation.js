const client = require('../utils/openaiClient');

module.exports = async function getEventsFromLocation(location) {
  const prompt = `Generate a list of events or cultural and/or political happenings in ${location}, South Africa in the last 40 years. Display it like EVENT - TIME_PERIOD - CATEGORY. Return only the list. Don't number the events.`;

  try {
    // Create thread
    const thread = await client.beta.threads.create({});

    // Add user message
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Start assistant run
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Poll until complete
    let status = run.status;
    while (['queued', 'in_progress'].includes(status)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedRun = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;
    }

    if (status === 'completed') {
      const messages = await client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      const responseText = assistantMessage?.content?.[0]?.text?.value;

      if (!responseText) throw new Error('No content returned by assistant');

      // Parse response into array
      const eventsArray = responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      return eventsArray;
    }

    throw new Error(`Assistant failed or is not ready (status: ${status})`);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return [];
  }
};
