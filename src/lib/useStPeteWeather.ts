import { useEffect, useState } from 'react';

export type WeatherEffect = 'clear' | 'clouds' | 'fog' | 'rain' | 'storm';

export type Weather = {
  effect: WeatherEffect;
  label: string;
  temperature: number;
  wind: number;
};

const url =
  'https://api.open-meteo.com/v1/forecast?latitude=27.7676&longitude=-82.6403' +
  '&current=temperature_2m,weather_code,wind_speed_10m' +
  '&temperature_unit=fahrenheit&wind_speed_unit=mph';

// WMO weather interpretation codes, as returned by Open-Meteo.
function describe(code: number): Pick<Weather, 'effect' | 'label'> {
  if (code === 0) return { effect: 'clear', label: 'clear skies' };
  if (code === 1) return { effect: 'clear', label: 'mostly clear' };
  if (code === 2) return { effect: 'clouds', label: 'partly cloudy' };
  if (code === 3) return { effect: 'clouds', label: 'overcast' };
  if (code === 45 || code === 48) return { effect: 'fog', label: 'foggy' };
  if (code >= 51 && code <= 57) return { effect: 'rain', label: 'drizzle' };
  if (code >= 61 && code <= 67) return { effect: 'rain', label: 'rain' };
  if (code >= 71 && code <= 77) return { effect: 'clouds', label: 'snow?!' };
  if (code >= 80 && code <= 82) return { effect: 'rain', label: 'showers' };
  if (code >= 95) return { effect: 'storm', label: 'thunderstorms' };
  return { effect: 'clear', label: 'fair' };
}

// undefined while loading, null when the forecast is unavailable.
// The forecast is kept between visits to the homepage, so navigating away and
// back doesn't refetch it. It goes stale after ten minutes.
const FRESH_MS = 10 * 60_000;
let cached: { weather: Weather; at: number } | undefined;
let request: Promise<Weather | null> | undefined;

const fresh = () =>
  cached && Date.now() - cached.at < FRESH_MS ? cached.weather : undefined;

function loadWeather() {
  const hit = fresh();
  if (hit) return Promise.resolve(hit);
  // Callers that arrive while a request is in flight share it.
  request ??= fetch(url)
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then(({ current }) => {
      const weather = {
        ...describe(current.weather_code),
        temperature: Math.round(current.temperature_2m),
        wind: Math.round(current.wind_speed_10m),
      };
      cached = { weather, at: Date.now() };
      return weather;
    })
    // A failure isn't cached, so the next visit tries again. The scene simply
    // stays clear meanwhile.
    .catch(() => null)
    .finally(() => (request = undefined));
  return request;
}

export function useStPeteWeather() {
  const [weather, setWeather] = useState<Weather | null | undefined>(fresh);

  useEffect(() => {
    let mounted = true;
    void loadWeather().then((next) => {
      if (mounted) setWeather(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return weather;
}
