// utils/cleanText.js
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .normalize('NFKD')                          // Normalize unicode accents
    .replace(/[^\w\s.,'-]/g, '')                // Remove anything not a-z, A-Z, 0-9, space, dot, comma, dash, apostrophe
    .replace(/^[-–•\s]+/, '')                    // Remove leading dashes, bullets, spaces
    .trim();
}

module.exports = cleanText;
