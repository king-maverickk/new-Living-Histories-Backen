const client = require('./openaiClient');

module.exports = async function extractAddresses(scriptText, context) {
  if (!scriptText) return [];

  const prompt = `List only specific and mappable street-level locations (like "123 Main Street", "Gandhi Hall", "Impala Crescent") mentioned in this script. Do not include entire cities, provinces, countries, continents, or vague terms like "Parliament". Return just the list of location names, one per line, no commentary:\n\n${scriptText}`;

  try {
    context.log('Sending prompt to OpenAI');
    const thread = await client.beta.threads.create();
    await client.beta.threads.messages.create(thread.id, { role: 'user', content: prompt });
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    let status = run.status;
    let attempts = 0; // Retry up to 10 times with 1 second intervals
    while (['queued', 'in_progress'].includes(status) && attempts++ < 10) {
      await new Promise(res => setTimeout(res, 1000));
      status = (await client.beta.threads.runs.retrieve(thread.id, run.id)).status;
    }

    if (status !== 'completed') throw new Error(`OpenAI run failed (status: ${status})`);
    const messages = (await client.beta.threads.messages.list(thread.id)).data;
    const text = messages.find(m => m.role === 'assistant')?.content?.[0]?.text?.value;
    context.log(`OpenAI extracted addresses:\n${text}`);
    return text ? text.split('\n').map(l => l.trim()).filter(l => l) : [];

  } catch (err) {
    context.log.error('OpenAI error:', err.message);
    return [];
  }
}
// This function extracts addresses from a script using OpenAI's API.