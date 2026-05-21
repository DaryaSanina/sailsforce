/**
 * Tides Service for Sailsforce
 * Handles tidal data collection for UK beaches.
 * Uses UK Environment Agency for station locations and Open-Meteo for tidal predictions.
 */

const EA_STATIONS_URL = 'https://environment.data.gov.uk/flood-monitoring/id/stations?type=TideGauge';
const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

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
 * Fetches the list of tidal stations from the UK Environment Agency.
 */
async function fetchStations() {
  const response = await fetch(EA_STATIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch UK EA stations: ${response.statusText}`);
  }
  const data = await response.json();
  // Map EA fields to the format expected by the service
  return (data.items || []).map(station => ({
    id: station.stationReference,
    name: station.label,
    lat: station.lat,
    lng: station.long
  }));
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
 * Fetches tidal predictions for a specific location using Open-Meteo.
 * Since Open-Meteo provides hourly sea level height, we derive high/low tides
 * by finding local maxima and minima.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} date - Date in YYYYMMDD format
 * @returns {Promise<Array>} List of tidal events
 */
async function fetchTidalPredictions(lat, lon, date) {
  // Convert YYYYMMDD to YYYY-MM-DD
  const targetDateStr = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  
  // Fetch a 3-day window (yesterday, today, tomorrow) to ensure we find all peaks for the target day
  const targetDate = new Date(targetDateStr);
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1);

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'sea_level_height',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    timezone: 'UTC'
  });

  const url = `${OPEN_METEO_MARINE_URL}?${params.toString()}`;
  console.log('Open-Meteo URL:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }
  const data = await response.json();
  
  const hourlyTimes = data.hourly.time;
  const hourlyHeights = data.hourly.sea_level_height;

  // Find peaks (High) and troughs (Low) using a simple local extremum check
  const predictions = [];
  for (let i = 1; i < hourlyHeights.length - 1; i++) {
    const prev = hourlyHeights[i - 1];
    const curr = hourlyHeights[i];
    const next = hourlyHeights[i + 1];

    if (curr > prev && curr > next) {
      predictions.push({
        t: hourlyTimes[i].replace('T', ' '),
        v: curr.toFixed(3),
        type: 'H'
      });
    } else if (curr < prev && curr < next) {
      predictions.push({
        t: hourlyTimes[i].replace('T', ' '),
        v: curr.toFixed(3),
        type: 'L'
      });
    }
  }

  // Return only the events that fall on the target date
  return predictions.filter(p => p.t.startsWith(targetDateStr));
}

/**
 * Averages two sets of tidal predictions.
 * Matches tides by type (H/L) and proximity in time.
 */
function averagePredictions(pred1, pred2) {
  if (!pred1 || !pred2 || pred1.length === 0 || pred2.length === 0) return [];
  
  const averaged = [];
  
  for (const p1 of pred1) {
    const time1 = new Date(p1.t).getTime();
    
    // Find a matching tide in pred2: same type and within 4 hours
    const match = pred2.find(p2 => {
      if (p1.type !== p2.type) return false;
      const time2 = new Date(p2.t).getTime();
      return Math.abs(time1 - time2) < 4 * 60 * 60 * 1000;
    });

    if (match) {
      const time2 = new Date(match.t).getTime();
      const avgTime = new Date((time1 + time2) / 2);

      const val1 = parseFloat(p1.v);
      const val2 = parseFloat(match.v);
      const avgVal = (val1 + val2) / 2;

      averaged.push({
        t: avgTime.toISOString().replace('T', ' ').substring(0, 16),
        v: avgVal.toFixed(3),
        type: p1.type
      });
    }
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
    const predictions1 = await fetchTidalPredictions(station1.lat, station1.lng, date);

    // If we only have one station, or if it's very close (e.g. < 5km), don't average
    if (nearestStations.length === 1 || station1.distance < 5) {
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
      predictions2 = await fetchTidalPredictions(station2.lat, station2.lng, date);
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

    // If averaging failed to find matches, fall back to the primary station
    if (averaged.length === 0) {
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
