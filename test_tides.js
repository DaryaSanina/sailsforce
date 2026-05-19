const { getTidalData } = require('./weather_data_access/tides.js');

async function test() {
  const lat = 20.93; // Hookipa
  const lon = -156.35;
  
  console.log(`Fetching tidal data for ${lat}, ${lon}...`);
  try {
    const data = await getTidalData(lat, lon);
    console.log('Tidal Data Result:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
