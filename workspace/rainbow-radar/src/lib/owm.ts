export type OneCallDataPoint = {
  dt: number;
  weather?: { id: number; description?: string }[];
  rain?: { '1h'?: number } | number;
  clouds?: number;
  visibility?: number;
};

export type OneCallResponse = {
  lat: number;
  lon: number;
  timezone: string;
  current: OneCallDataPoint & { sunrise?: number; sunset?: number };
  hourly: (OneCallDataPoint & { pop?: number })[];
};

const API_KEY = import.meta.env.VITE_OWM_API_KEY || 'c22c23836796eca7facc1015373a693f';

export async function fetchOneCall(lat: number, lon: number): Promise<OneCallResponse> {
  const url = new URL('https://api.openweathermap.org/data/3.0/onecall');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('exclude', 'minutely,alerts');
  url.searchParams.set('appid', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`OWM error: ${res.status}`);
  }
  const data = (await res.json()) as OneCallResponse;
  return data;
}