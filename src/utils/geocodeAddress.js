const axios = require('axios');

module.exports = async function geocodeAddress(address) {
  console.log(`Geocoding address: ${address}`);

  try {
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;

    const { data } = await axios.get(url, {
      params: { address, key: apiKey },
      timeout: 5000, // ⏱️ timeout after 5 seconds
    });

    if (data.status !== 'OK' || !data.results.length) {
      console.warn(`⚠️ No geocoding result for: ${address}. Status: ${data.status}`);
      return null;
    }

    const result = data.results[0];
    return {
      formatted_address: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lon: result.geometry.location.lng,
      },
    };
  } catch (err) {
    console.error(`‼️ Geocode error for "${address}": ${err.message}`);
    return null;
  }
};
