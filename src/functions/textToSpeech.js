const { uploadAudio } = require('../utils/blobStorage');
const slugify = require('../utils/slugify');
const axios = require('axios');

/**
 * Parse a script into an array of dialogue segments with speaker identification
 * @param {string} scriptText - The full script text
 * @returns {Array} Array of objects with speaker and text properties
 */
function parseScript(scriptText) {
  if (!scriptText || typeof scriptText !== 'string') {
    throw new Error('Invalid script: Script must be a non-empty string');
  }

  const lines = scriptText.trim().split('\n');
  const dialogueSegments = [];
  let currentSpeaker = null;
  let currentText = '';

  // Process each line in the script
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines but add them as separators between dialogue segments
    if (!line) {
      if (currentSpeaker && currentText) {
        dialogueSegments.push({ speaker: currentSpeaker, text: currentText.trim() });
        currentSpeaker = null;
        currentText = '';
      }
      continue;
    }

    // Check for speaker pattern: "Name: Text"
    const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
    
    if (speakerMatch) {
      // If we already have content for a previous speaker, save it
      if (currentSpeaker && currentText) {
        dialogueSegments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      
      // Start new speaker segment
      currentSpeaker = speakerMatch[1].trim();
      currentText = speakerMatch[2].trim();
    } else if (currentSpeaker) {
      // Continue text for current speaker
      currentText += ' ' + line;
    } else {
      // If there's a line without speaker and no current speaker, treat as anonymous speaker
      currentSpeaker = 'Narrator';
      currentText = line;
    }
  }

  // Add the last segment if there's any remaining
  if (currentSpeaker && currentText) {
    dialogueSegments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return dialogueSegments;
}

/**
 * Escape XML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate SSML for Azure Speech Service with multiple voices
 * @param {Array} dialogueSegments - Array of dialogue segments
 * @returns {string} SSML document
 */
function generateSSML(dialogueSegments) {
  // Start SSML document
  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
  
  // Add each voice segment
  dialogueSegments.forEach(segment => {
    let voice = 'en-US-EmmaNeural'; // Default voice
    
    // Assign voices based on speaker name
    if (segment.speaker.toLowerCase() === 'elijah') {
      voice = 'en-US-AndrewNeural'; // Andrew Dragon HD for Elijah
    } else if (segment.speaker.toLowerCase() === 'ayana') {
      voice = 'en-US-EmmaNeural'; // Emma2 Dragon HD for Ayana
    }
    
    // Add voice tag with text
    ssml += `<voice name="${voice}">${escapeXml(segment.text)}</voice>`;
  });
  
  // Close SSML document
  ssml += '</speak>';
  
  return ssml;
}

async function listVoices() {
  const url = 'https://eastus2.tts.speech.microsoft.com/cognitiveservices/voices/list';
  const r = await axios.get(url, { headers: { 'Ocp-Apim-Subscription-Key': process.env.TTS_KEY, 'User-Agent':'voices-list/1.0' }});
  console.log(r.data.map(v => v.Name).slice(80,180)); // prints names
}


module.exports = async function textToSpeech(scriptText, eventTitle) {
  try {
    // Parse script to identify speakers and their dialogue
    const dialogueSegments = parseScript(scriptText);
    
    
    // Generate SSML with multiple voices
    const ssml = generateSSML(dialogueSegments);

    // Ensure endpoint includes the required path
    const base = process.env.TTS_ENDPOINT;
    if (!base) throw new Error('TTS_ENDPOINT is not set in environment');
    const endpoint = `${base.replace(/\/+$/,'')}/cognitiveservices/v1`;
    console.log('TTS endpoint:', endpoint);

    const response = await axios({
      method: 'post',
      url: endpoint,
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.TTS_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'Accept': 'audio/mpeg',
        'User-Agent': 'myApp/1.0.0' // some Azure endpoints require this or behave better with it
      },
      data: ssml,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    if (response.status !== 200) {
      // include response body in the thrown error
      const body = response.data ? Buffer.from(response.data).toString('utf8') : '<no body>';
      throw new Error(`TTS request failed with status ${response.status}: ${body}`);
    }
    
    console.log('TTS request successful:', response.status);
    
    // Convert response to buffer
    const buffer = Buffer.from(response.data);
    
    // Upload to blob storage using the imported function
    const fileName = `${slugify(eventTitle)}.mp3`;
    const audioUrl = await uploadAudio(fileName, buffer);
    console.log('Audio uploaded successfully:', audioUrl);
    
    console.log('Generating audio for event:', eventTitle);
    
    // listVoices().catch(e => console.error(e.response?.data || e.message));
    return audioUrl;

  } catch (error) {
    // better error visibility
    if (error.response) {
      // axios error with response
      console.error('TTS error response status:', error.response.status);
      try {
        console.error('TTS error response body:', error.response.data.toString ? error.response.data.toString('utf8') : error.response.data);
      } catch (e) { console.error('Could not parse response data'); }
    } else {
      console.error('TTS error:', error.message);
    }
    throw new Error('Text-to-speech conversion failed: ' + (error.message || 'unknown'));
  }
};
