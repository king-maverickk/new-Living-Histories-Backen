// In your geocodeAll.js
const geocodeAddress = require('./geocodeAddress');
const cleanText = require('./cleanText');

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

module.exports = async function geocodeAll(addresses = [], context) {
  if (!addresses.length) {
    context.log('No addresses to geocode.');
    return [];
  }

  const results = [];

  for (let raw of addresses) {
    const address = cleanText(raw);
    if (!address) continue;

    context.log(`→ Geocoding: ${address}`);
    const geo = await geocodeAddress(address);

    if (geo) {
      results.push(geo);
      context.log(`√ Success: ${address} → ${geo.formatted_address}`);
    } else {
      context.log.warn(`✗ Failed to geocode: ${address}`);
    }

    await delay(300);
  }

  return results;
};
