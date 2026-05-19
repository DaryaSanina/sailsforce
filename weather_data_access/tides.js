/**
 * Tides Service for Sailsforce
 * Handles tidal data collection from NOAA CO-OPS API.
 */

const NOAA_MDAPI_URL = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels';
const NOAA_DATAGETTER_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * Calculates the Haversine distance between two points on Earth.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Fetches the list of tidal stations from NOAA.
 */
async function fetchStations() {
  const response = await fetch(NOAA_MDAPI_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch NOAA stations: ${response.statusText}`);
  }
  const data = await response.json();
  return data.stations || [];
}

/**
 * Finds the nearest tidal stations to the provided coordinates.
 */
async function findNearestStations(lat, lon, count = 2) {
  const stations = await fetchStations();
  const stationsWithDistance = stations.map(station => ({
    ...station,
    distance: getDistance(lat, lon, station.lat, station.lng)
  }));

  return stationsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/**
 * Fetches tidal predictions for a specific station.
 */
async function fetchTidalPredictions(stationId, date) {
  const params = new URLSearchParams({
    begin_date: date,
    end_date: date,
    station: stationId,
    product: 'predictions',
    datum: 'MLLW',
    time_zone: 'lst_ldt',
    interval: 'hilo',
    units: 'metric',
    format: 'json',
    application: 'Sailsforce'
  });

  const url = `${NOAA_DATAGETTER_URL}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tidal predictions for station ${stationId}: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(`NOAA API Error for station ${stationId}: ${data.error.message}`);
  }
  return data.predictions || [];
}

/**
 * Averages two sets of tidal predictions.
 * Matches tides by type (H/L) and sequential order.
 */
function averagePredictions(pred1, pred2) {
  if (!pred1 || !pred2) return [];
  
  const averaged = [];
  const minLength = Math.min(pred1.length, pred2.length);

  for (let i = 0; i < minLength; i++) {
    const p1 = pred1[i];
    const p2 = pred2[i];

    if (!p1 || !p2) continue;

    // Ensure we are averaging the same type of tide
    if (p1.type !== p2.type) {
      // In a real-world scenario, we might need a more robust matching algorithm
      continue;
    }

    const time1 = new Date(p1.t).getTime();
    const time2 = new Date(p2.t).getTime();
    const avgTime = new Date((time1 + time2) / 2);

    const val1 = parseFloat(p1.v);
    const val2 = parseFloat(p2.v);
    const avgVal = (val1 + val2) / 2;

    averaged.push({
      t: avgTime.toISOString().replace('T', ' ').substring(0, 16),
      v: avgVal.toFixed(3),
      type: p1.type
    });
  }

  return averaged;
}

/**
 * Main function to get tidal data for a location.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} date - Date in YYYYMMDD format (optional, defaults to today)
 * @returns {Promise<Object>} Tidal data
 */
async function getTidalData(lat, lon, date = null) {
  if (!date) {
    const today = new Date();
    date = today.toISOString().split('T')[0].replace(/-/g, '');
  }

  try {
    const nearestStations = await findNearestStations(lat, lon, 2);
    
    if (nearestStations.length === 0) {
      throw new Error('No tidal stations found.');
    }

    const station1 = nearestStations[0];
    const predictions1 = await fetchTidalPredictions(station1.id, date);

    // If we only have one station, or if it's very close (e.g. < 2km), don't average
    if (nearestStations.length === 1 || station1.distance < 2) {
      return {
        station: {
          id: station1.id,
          name: station1.name,
          distance: station1.distance
        },
        isAveraged: false,
        predictions: predictions1
      };
    }

    const station2 = nearestStations[1];
    let predictions2 = [];
    try {
      predictions2 = await fetchTidalPredictions(station2.id, date);
    } catch (e) {
      console.warn(`Failed to fetch predictions for second station ${station2.id}:`, e.message);
      return {
        station: {
          id: station1.id,
          name: station1.name,
          distance: station1.distance
        },
        isAveraged: false,
        predictions: predictions1
      };
    }

    const averaged = averagePredictions(predictions1, predictions2);

    return {
      stations: [
        { id: station1.id, name: station1.name, distance: station1.distance },
        { id: station2.id, name: station2.name, distance: station2.distance }
      ],
      isAveraged: true,
      predictions: averaged
    };

  } catch (error) {
    console.error('Error fetching tidal data:', error);
    throw error;
  }
}

module.exports = {
  getTidalData
};
