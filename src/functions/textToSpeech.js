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
        dialogueSegments.push({
          speaker: currentSpeaker,
          text: currentText.trim()
        });
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
        dialogueSegments.push({
          speaker: currentSpeaker,
          text: currentText.trim()
        });
      }
      
      // Start new speaker segment
      currentSpeaker = speakerMatch[1].trim();
      currentText = speakerMatch[2].trim();
    } else if (currentSpeaker) {
      // Continue text for current speaker
      currentText += ' ' + line;
    }
  }

  // Add the last segment if there's any remaining
  if (currentSpeaker && currentText) {
    dialogueSegments.push({
      speaker: currentSpeaker,
      text: currentText.trim()
    });
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
    let voice = 'en-US-AndrewDragonHD'; // Default voice
    
    // Assign voices based on speaker name
    if (segment.speaker.toLowerCase() === 'elijah') {
      voice = 'en-US-Andrew:DragonHDLatestNeural'; // Andrew Dragon HD for Elijah
    } else if (segment.speaker.toLowerCase() === 'ayana') {
      voice = 'en-US-Emma2:DragonHDLatestNeural'; // Emma2 Dragon HD for Ayana
    }
    
    // Add voice tag with text
    ssml += `<voice name="${voice}">${escapeXml(segment.text)}</voice>`;
  });
  
  // Close SSML document
  ssml += '</speak>';
  
  return ssml;
}

module.exports = async function textToSpeech(scriptText, eventTitle) {
  try {
    // Parse script to identify speakers and their dialogue
    const dialogueSegments = parseScript(scriptText);
    
    // Generate SSML with multiple voices
    const ssml = generateSSML(dialogueSegments);
    
    // Call Azure Speech Service
    const response = await axios({
      method: 'post',
      url: process.env.TTS_ENDPOINT,
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.TTS_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      },
      data: ssml,
      responseType: 'arraybuffer',
    });

    if (response.status !== 200) {
      throw new Error(`TTS request failed with status ${response.status}`);
    }
    
    console.log('TTS request successful:', response.status);
    
    // Convert response to buffer
    const buffer = Buffer.from(response.data);
    
    // Upload to blob storage using the imported function
    const fileName = `${slugify(eventTitle)}.mp3`;
    const audioUrl = await uploadAudio(fileName, buffer);
    
    console.log('Generating audio for event:', eventTitle);
    return audioUrl;
  } catch (error) {
    console.error('Error during TTS request:', error.message);
    throw new Error('Text-to-speech conversion failed');
  }
};
