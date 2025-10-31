const { client, deployment } = require('../utils/openaiClient');

module.exports = async function generateScript(event, years, category, location, country) {
  const prompt = `You're writing a fully-scripted, 6-9 minute episode of a witty, insightful history podcast hosted by two close friends who love a good story as much as they love a good fact.

    Meet the hosts:

    Elijah (he/him) - the curious, creative one. He's all about people, art, culture, and finding the emotional heart of a story. He's the type to say, “Wait, what? That actually happened?” and make it fun to care.

    Ayana (she/her) - the brainy powerhouse. She brings the research, the context, and the political depth. She digs deep but keeps it human. She's sharp, compassionate, and knows when to drop a surprising historical quote or a mic-drop fact.

    Their style? Think light banter, smart observations, and a good sense of rhythm. They don't argue—they riff off each other, support each other's points, and balance emotion and intellect. If the story is heavy or tragic, they treat it with care. If it's strange or delightful, they might sneak in a joke or a personal memory.

    🎧 Audience: Curious teens to elder historians (ages 15-75), including tourists and locals looking to reconnect with their country's layered, beautiful, sometimes messy story.

    🎙️ Your job: Write a fully-written conversation between Elijah and Ayana—natural, smart, and meant to be spoken. Every line should sound like something you'd hear from real friends who know their stuff and know how to tell a story.

    Episode Details:

    Event: ${event}

    Location: ${location}, ${country}

    Years or Time Period: ${years}

    Category: ${category} (Cultural, Political, Historical, or Artistic)

    Guidelines:

    No stage directions, timestamps, or music cues.

    Weave in real places (a statue, plaque, street name, museum, park, building) where relevant.

    Use rich storytelling, light humor, and clever dialogue.

    Introduce lesser-known facts without overloading—treat the audience as smart but not academic.

    Quotes or references? Include them, but keep them conversational.

    Write who's speaking at the start of each line (e.g., Elijah: “...")

    Tone goal:
    Make this history feel alive. Not like a lecture, not like a news summary—more like, “Wow, I never knew that,” over coffee.

    Wrap it up with:
    A warm closing or a forward-looking note—how this story still resonates today. Don't summarize; just let the last lines feel like the end of a meaningful, satisfying story.`;

  try {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: 'You are a skilled podcast scriptwriter with a historian’s insight and a storyteller’s rhythm.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 3000,
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    return text || '[No response text from model]';
  } catch (error) {
    console.error('Error generating script:', error.message);
    return '[Error generating script]';
  }
};
