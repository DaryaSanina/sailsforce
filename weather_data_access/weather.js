/**
 * Weather Service for Sailsforce
 * Handles data collection from Open-Meteo API for weather and marine forecasts.
 */

/**
 * Fetches combined weather and marine data for a given location.
 * Including wind data from multiple meteorological models (ECMWF, GFS, ICON, UKMO).
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Combined weather and marine data
 */
async function fetchWeatherData(lat, lon) {
  // TODO: Add additional models
  // Models to fetch wind data from
  // ecmwf_ifs025: ECMWF IFS (9 km, Global)
  // gfs_seamless: NOAA GFS (Global + regional)
  // icon_seamless: DWD ICON (Global + regional)
  // ukmo_seamless: UK Met Office (Global + regional)
  const windModels = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
  
  // Weather Forecast API: wind, temperature, general conditions + specific wind models
  const weatherParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum',
    models: windModels.join(','),
    timezone: 'auto'
  });

  // Marine API: swell and wave data
  const marineParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
    hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
    timezone: 'auto'
  });

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?${marineParams.toString()}`;

  try {
    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl)
    ]);

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      throw new Error(`Weather API error: ${weatherResponse.status} - ${errorText}`);
    }

    if (!marineResponse.ok) {
      const errorText = await marineResponse.text();
      throw new Error(`Marine API error: ${marineResponse.status} - ${errorText}`);
    }

    const weatherData = await weatherResponse.json();
    const marineData = await marineResponse.json();

    // Organize multi-model wind data from the hourly response
    // Open-Meteo appends the model name to the variable (e.g., wind_speed_10m_ecmwf_ifs025)
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
          // TODO: Verify units from API response 
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
  } catch (error) {
    console.error('Failed to collect weather data:', error);
    throw error;
  }
}

module.exports = {
  fetchWeatherData
};
