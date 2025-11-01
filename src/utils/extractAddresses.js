const { client, deployment } = require('./openaiClient');

module.exports = async function extractAddresses(scriptText, context) {
  if (!scriptText) return [];

  const prompt = `List only specific and mappable street-level locations (like "123 Main Street", "Gandhi Hall", "Impala Crescent") mentioned in this script. Do not include entire cities, provinces, countries, continents, or vague terms like "Parliament". Return just the list of location names, one per line, no commentary:\n\n${scriptText}`;

  try {
    context.log('Sending prompt to OpenAI');

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: 'You extract only specific, mappable street-level locations from text. You never add commentary.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    context.log(`OpenAI extracted addresses:\n${text}`);
    return text ? text.split('\n').map(l => l.trim()).filter(l => l) : [];

  } catch (err) {
    context.log.error('OpenAI error:', err.message);
    return [];
  }
}
// This function extracts addresses from a script using OpenAI's API.