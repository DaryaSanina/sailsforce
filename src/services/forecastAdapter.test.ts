import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { BeachLocation } from "../domain/models";
import { adaptForecast } from "./forecastAdapter";
import { angleDifference, windBeachOrientation } from "./forecastMath";
import type { RawForecastResponse } from "./weatherClient";

const location: BeachLocation = {
  id: "test-beach",
  name: "Test Beach",
  region: "Devon",
  lat: 50,
  lon: -4,
  normal: 90,
};

describe("adaptForecast", () => {
  it("maps Open-Meteo weather and marine data into app forecast hours", () => {
    const raw: RawForecastResponse = {
      fetchedAt: "2026-05-21T12:00:00.000Z",
      weather: {
        timezone: "Europe/London",
        hourly: {
          time: ["2026-05-21T00:00", "2026-05-21T01:00", "2026-05-21T02:00"],
          temperature_2m: [14.1, 15.2, 16.3],
          apparent_temperature: [13.8, 15, 16],
          relative_humidity_2m: [80, 78, 76],
          uv_index: [0, 0, 1],
          weather_code: [0, 1, 2],
          wind_speed_10m: [10, 12, 14],
          wind_direction_10m: [90, 100, 110],
          wind_gusts_10m: [15, 18, 20],
          wind_speed_10m_ecmwf_ifs025: [9, 12, 13],
          wind_speed_10m_gfs_seamless: [11, 13, 15],
          wind_speed_10m_icon_seamless: [10, 11, 14],
          wind_gusts_10m_ecmwf_ifs025: [14, 17, 19],
          wind_gusts_10m_gfs_seamless: [16, 19, 21],
          wind_gusts_10m_icon_seamless: [15, 18, 20],
        },
      },
      marine: {
        timezone: "Europe/London",
        hourly: {
          wave_height: [0.4, 0.5, 0.6],
          wave_direction: [180, 185, 190],
          wave_period: [4, 4.5, 5],
          swell_wave_height: [0.2, 0.3, 0.4],
          swell_wave_direction: [200, 205, 210],
          swell_wave_period: [6, 6.5, 7],
          sea_level_height_msl: [0, 1, 0],
        },
      },
    };

    const forecast = adaptForecast(location, raw);

    assert.equal(forecast.locationId, "test-beach");
    assert.equal(forecast.timezone, "Europe/London");
    assert.equal(forecast.hours.length, 3);
    assert.equal(forecast.hours[0].wind, 10);
    assert.equal(forecast.hours[0].windDirLabel, "E");
    assert.equal(forecast.hours[0].spread, 2);
    assert.deepEqual(forecast.hours[0].models, [
      [9, 14],
      [11, 16],
      [10, 15],
    ]);
    assert.equal(forecast.hours[1].tide, 1);
    assert.equal(forecast.tides.length, 1);
    assert.equal(forecast.tides[0].type, "high");
  });

  it("uses model wind values when Open-Meteo omits the base wind series", () => {
    const raw: RawForecastResponse = {
      fetchedAt: "2026-05-21T12:00:00.000Z",
      weather: {
        hourly: {
          time: ["2026-05-21T00:00"],
          wind_speed_10m_ecmwf_ifs025: [9],
          wind_speed_10m_gfs_seamless: [12],
          wind_speed_10m_icon_seamless: [15],
          wind_gusts_10m_ecmwf_ifs025: [14],
          wind_gusts_10m_gfs_seamless: [17],
          wind_gusts_10m_icon_seamless: [20],
          wind_direction_10m: [270],
        },
      },
      marine: { hourly: {} },
    };

    const forecast = adaptForecast(location, raw);

    assert.equal(forecast.hours[0].wind, 12);
    assert.equal(forecast.hours[0].gust, 17);
    assert.equal(forecast.hours[0].spread, 6);
    assert.deepEqual(forecast.hours[0].models, [
      [9, 14],
      [12, 17],
      [15, 20],
    ]);
  });
});

describe("forecastMath", () => {
  it("classifies beach-relative wind from the beach normal", () => {
    assert.equal(angleDifference(350, 10), 20);
    assert.equal(windBeachOrientation(90, 90), "ONSHORE");
    assert.equal(windBeachOrientation(180, 90), "CROSS-SHORE");
    assert.equal(windBeachOrientation(270, 90), "OFFSHORE");
  });
});
