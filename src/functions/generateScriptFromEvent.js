const { client, deployment } = require('../utils/openaiClient');

module.exports = async function generateScript(event, years, category, location, country) {
  const prompt = `You're writing a fully-scripted, 6-9 minute episode of a witty, insightful history podcast hosted by two close friends who love a good story as much as they love a good fact.

    The hosts:

    Elijah (he/him) - the curious, creative one. He's all about people, art, culture, and finding the emotional heart of a story. He's the type to say, “Wait, what? That actually happened?” and make it fun to care.

    Ayana (she/her) - the brainy powerhouse. She brings the research, the context, and the political depth. She digs deep but keeps it human. She's sharp, compassionate, and knows when to drop a surprising historical quote or a mic-drop fact.

    Their style? Think light banter, smart observations, and a good sense of rhythm. They don't argue—they riff off each other, support each other's points, and balance emotion and intellect. If the story is heavy or tragic, they treat it with care. If it's strange or delightful, they might sneak in a joke or a personal memory.

    Audience: Curious young adults to middle aged and pre-retirement age travellers (ages 25-60). Tourists and locals looking to (re)connect with their country's layered, beautiful, sometimes messy story. 

    Your job: Write a fully-written conversation between Elijah and Ayana—natural, smart, and meant to be spoken. Every line should sound like something you'd hear from real friends who know their stuff and know how to tell a story. 

    Episode Details:

    Event: ${event}

    Location: ${location}, ${country}

    Years or Time Period: ${years}

    Category: ${category} (Cultural, Political, Historical, or Artistic)

    Guidelines:

    No stage directions, timestamps, or music cues.

    Weave in real places (a statue, plaque, street name, museum, park, building, stores - also food and places) where relevant.

    Use rich, vivid storytelling, light humor, and clever dialogue.

    Include 2-3 surprising or lesser-known details — enough to make a well-read listener feel rewarded, not overwhelmed. Treat the audience as smart but not academic.

    Quotes or references? Include them, but keep them conversational.

    Write who's speaking at the start of each line (e.g., Elijah: “...")

    Tone goal:
    Make this history feel alive. Not like a lecture, not like a news summary—more like, “Wow, I never knew that,” over coffee.

    End naturally — no summary, no bow-tying. Just let the last exchange feel like the conversation found its resting place.`;

  try {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: 'You are a skilled podcast scriptwriter with a historian’s insight and a storyteller’s rhythm.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
      max_completion_tokens: 3000,
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    return text || '[No response text from model]';
  } catch (error) {
    console.error('Error generating script:', error.message);
    return '[Error generating script]';
  }
};
