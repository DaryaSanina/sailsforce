const fs = require('fs');

const beaches = [
  { name: 'Exmouth', lat: 50.608, lon: -3.376 },
  { name: 'Brighton', lat: 50.816, lon: -0.138 },
  { name: 'Newquay (Fistral)', lat: 50.418, lon: -5.105 },
  { name: 'St Andrews (West Sands)', lat: 56.358, lon: -2.812 },
  { name: 'Bamburgh', lat: 55.611, lon: -1.708 }
];

async function fetchWeatherData(lat, lon) {
  const windModels = [
    'ecmwf_ifs025',
    'gfs_seamless',
    'icon_seamless',
    'ukmo_seamless',
    'meteofrance_seamless',
    'knmi_seamless',
    'gem_seamless'
  ];
  
  const weatherParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum',
    models: windModels.join(','),
    timezone: 'auto'
  });

  const marineParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
    hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
    timezone: 'auto'
  });

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?${marineParams.toString()}`;

  const [weatherResponse, marineResponse] = await Promise.all([
    fetch(weatherUrl),
    fetch(marineUrl)
  ]);

  const weatherData = await weatherResponse.json();
  const marineData = await marineResponse.json();

  const modelsData = {};
  windModels.forEach(model => {
    modelsData[model] = {
      wind_speed_10m: weatherData.hourly[`wind_speed_10m_${model}`],
      wind_direction_10m: weatherData.hourly[`wind_direction_10m_${model}`],
      wind_gusts_10m: weatherData.hourly[`wind_gusts_10m_${model}`]
    };
  });

  return {
    metadata: {
      latitude: lat,
      longitude: lon,
      fetchedAt: new Date().toISOString(),
      models_requested: windModels,
      units: {
        temperature: weatherData.current_units?.temperature_2m || '°C',
        wind_speed: weatherData.current_units?.wind_speed_10m || 'km/h',
        wave_height: marineData.current_units?.wave_height || 'm'
      }
    },
    current: {
      ...weatherData.current,
      ...marineData.current
    },
    hourly: {
      time: weatherData.hourly.time,
      ...weatherData.hourly,
      ...marineData.hourly
    },
    daily: weatherData.daily,
    wind_models: modelsData
  };
}

async function generate() {
  const results = {};
  for (const beach of beaches) {
    console.log(`Fetching data for ${beach.name}...`);
    try {
      results[beach.name] = await fetchWeatherData(beach.lat, beach.lon);
    } catch (e) {
      console.error(`Failed to fetch for ${beach.name}:`, e);
    }
  }
  fs.writeFileSync('weather_data_access/test_beaches_data.json', JSON.stringify(results, null, 2));
  console.log('Saved to weather_data_access/test_beaches_data.json');
}

generate().catch(console.error);
