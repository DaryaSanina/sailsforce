const fs = require('fs');
const path = require('path');

/**
 * Test suite for UK beach weather data.
 */

function runTests() {
  const dataPath = path.join(__dirname, 'test_beaches_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Error: test_beaches_data.json not found. Run the generator first.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const beaches = Object.keys(data);

  console.log('--- Running UK Beach Weather Data Tests ---');

  testBeachCount(beaches);
  testExmouthPresence(beaches);
  
  beaches.forEach(beachName => {
    console.log(`\nTesting ${beachName}:`);
    const beachData = data[beachName];
    testDataStructure(beachName, beachData);
    testForecastContinuity(beachName, beachData);
    testCoordinateSanity(beachName, beachData);
    testWindModels(beachName, beachData);
  });

  console.log('\n--- All tests completed ---');
}

function testBeachCount(beaches) {
  if (beaches.length === 5) {
    console.log('✓ Found exactly 5 beaches.');
  } else {
    console.error(`✗ Expected 5 beaches, found ${beaches.length}.`);
  }
}

function testExmouthPresence(beaches) {
  if (beaches.includes('Exmouth')) {
    console.log('✓ Exmouth is included in the test set.');
  } else {
    console.error('✗ Exmouth is missing from the test set.');
  }
}

function testDataStructure(name, data) {
  const requiredKeys = ['metadata', 'current', 'hourly', 'daily', 'wind_models'];
  const missing = requiredKeys.filter(key => !data[key]);
  if (missing.length === 0) {
    console.log(`  ✓ Data structure is complete.`);
  } else {
    console.error(`  ✗ Missing keys: ${missing.join(', ')}`);
  }
}

function testForecastContinuity(name, data) {
  if (data.hourly && data.hourly.time) {
    const hours = data.hourly.time.length;
    if (hours >= 168) {
      console.log(`  ✓ Forecast covers ${hours} hours (full week).`);
    } else {
      console.error(`  ✗ Forecast only covers ${hours} hours.`);
    }
  }
}

function testCoordinateSanity(name, data) {
  const { latitude, longitude } = data.metadata;
  // UK bounds roughly 49N to 61N, 8W to 2E
  if (latitude > 49 && latitude < 61 && longitude > -10 && longitude < 3) {
    console.log(`  ✓ Coordinates (${latitude}, ${longitude}) are within UK bounds.`);
  } else {
    console.error(`  ✗ Coordinates (${latitude}, ${longitude}) seem outside the UK.`);
  }
}

function testWindModels(name, data) {
  if (data.wind_models) {
    const models = Object.keys(data.wind_models);
    if (models.length > 0) {
      console.log(`  ✓ Found ${models.length} wind models: ${models.join(', ')}`);
    } else {
      console.error('  ✗ No wind models found.');
    }
  }
}

// Export for use or run directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBeachCount,
  testExmouthPresence,
  testDataStructure,
  testForecastContinuity,
  testCoordinateSanity,
  testWindModels
};
