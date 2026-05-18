const { fetchWeatherData } = require('./weather');

// Example coordinates (Exmouth, UK)
const LAT = 50.6187;
const LON = -3.4124;

console.log(`Fetching weather data for Lat: ${LAT}, Lon: ${LON}...`);

fetchWeatherData(LAT, LON)
  .then(data => {
    console.log('Successfully collected weather data:');
    console.log(JSON.stringify(data.metadata, null, 2));
    console.log('Current Conditions Summary:');
    console.log(`- Temperature: ${data.current.temperature_2m}${data.metadata.units.temperature}`);
    console.log(`- Wind Speed: ${data.current.wind_speed_10m}${data.metadata.units.wind_speed}`);
    console.log(`- Wave Height: ${data.current.wave_height}${data.metadata.units.wave_height}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during verification:', err);
    process.exit(1);
  });
