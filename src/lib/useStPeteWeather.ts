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
export function useStPeteWeather() {
  const [weather, setWeather] = useState<Weather | null>();

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(({ current }) =>
        setWeather({
          ...describe(current.weather_code),
          temperature: Math.round(current.temperature_2m),
          wind: Math.round(current.wind_speed_10m),
        }),
      )
      .catch(() => {
        // The scene simply stays clear when the weather is unavailable.
        if (!controller.signal.aborted) setWeather(null);
      });
    return () => controller.abort();
  }, []);

  return weather;
}
