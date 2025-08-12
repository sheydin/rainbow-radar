// Solar geometry utilities
// Angles are in degrees for external API; internally we convert to radians.

export type SunAngles = {
  elevationDeg: number;
  azimuthDeg: number; // solar azimuth (degrees from North, clockwise)
};

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;

function normalizeAngle360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

// Julian Day
export function toJulianDate(date: Date): number {
  // Algorithm from NOAA; works for 1900-2099
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate() + (date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) / 24;

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let JDN = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return JDN;
}

// Compute solar position using NOAA simplified algorithm
export function getSunAnglesForTime(lat: number, lon: number, date: Date): SunAngles {
  // Convert time to fractional hours in UTC
  const millis = date.getTime();
  const timeUTC = new Date(millis + date.getTimezoneOffset() * 60000);

  const year = timeUTC.getUTCFullYear();
  const month = timeUTC.getUTCMonth() + 1;
  const day = timeUTC.getUTCDate();
  const hours = timeUTC.getUTCHours() + timeUTC.getUTCMinutes() / 60 + timeUTC.getUTCSeconds() / 3600;

  // Julian Day and centuries since J2000.0
  const JD = (Date.UTC(year, month - 1, day) / 86400000) + 2440587.5 + hours / 24;
  const T = (JD - 2451545.0) / 36525.0;

  const L0 = normalizeAngle360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeAngle360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  const Mrad = deg2rad(M);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);
  const trueLongitude = L0 + C; // degrees
  // const trueAnomaly = M + C;
  // const R = 1.000001018 * (1 - e * e) / (1 + e * Math.cos(deg2rad(trueAnomaly)));

  // Apparent longitude
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));

  // Obliquity of the ecliptic
  const epsilon0 = 23 + (26 + ((21.448 - T * (46.815 + T * (0.00059 - T * 0.001813)))) / 60) / 60; // arcseconds
  const epsilon = epsilon0 + 0.00256 * Math.cos(deg2rad(omega));

  // Right ascension and declination
  const lambdaRad = deg2rad(lambda);
  const epsilonRad = deg2rad(epsilon);
  // const alpha = rad2deg(Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad))); // RA (unused)
  const delta = rad2deg(Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad))); // Dec

  // Equation of time (minutes)
  const y = Math.tan(epsilonRad / 2) ** 2;
  const L0rad = deg2rad(L0);
  const Mrad2 = Mrad;
  const Etime = 4 * rad2deg(y * Math.sin(2 * L0rad) - 2 * e * Math.sin(Mrad2) + 4 * e * y * Math.sin(Mrad2) * Math.cos(2 * L0rad)
    - 0.5 * y * y * Math.sin(4 * L0rad) - 1.25 * e * e * Math.sin(2 * Mrad2));

  // Solar time
  const timeOffset = Etime + 4 * lon; // minutes
  const trueSolarTime = (hours * 60 + timeOffset) % 1440; // minutes
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180; // degrees

  const latRad = deg2rad(lat);
  const deltaRad = deg2rad(delta);
  const Hrad = deg2rad(hourAngle);

  const elevation = rad2deg(Math.asin(Math.sin(latRad) * Math.sin(deltaRad) + Math.cos(latRad) * Math.cos(deltaRad) * Math.cos(Hrad)));

  // Azimuth calculation (from North, clockwise)
  const azNumerator = -Math.sin(Hrad);
  const azDenominator = Math.tan(deltaRad) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(Hrad);
  let azimuth = rad2deg(Math.atan2(azNumerator, azDenominator));
  azimuth = normalizeAngle360(azimuth);

  return { elevationDeg: elevation, azimuthDeg: azimuth };
}

export function computeRainbowProbabilityScore(params: {
  userLat: number;
  userLon: number;
  cellLat: number;
  cellLon: number;
  antisolarAzimuthDeg: number;
  sunElevationDeg: number;
  weather: {
    rain?: { '1h'?: number } | number;
    clouds?: number;
    visibility?: number;
    weather?: { id: number }[];
  };
  bearingUserToCellDeg: number;
}): number {
  const { antisolarAzimuthDeg, sunElevationDeg, weather, bearingUserToCellDeg } = params;

  if (sunElevationDeg <= 0 || sunElevationDeg >= 42) return 0;

  const deltaTheta = Math.min(
    Math.abs(bearingUserToCellDeg - antisolarAzimuthDeg),
    360 - Math.abs(bearingUserToCellDeg - antisolarAzimuthDeg)
  );
  const sigmaTheta = 18; // degrees
  const w_azi = Math.exp(-Math.pow(deltaTheta / sigmaTheta, 2));

  const w_sun = Math.max(0, 1 - sunElevationDeg / 42);

  let mmh = 0;
  if (typeof weather.rain === 'number') mmh = weather.rain;
  else if (typeof weather.rain === 'object' && weather.rain && typeof weather.rain['1h'] === 'number') mmh = weather.rain['1h']!;
  if (!mmh && weather.weather && weather.weather.length > 0) {
    const id = weather.weather[0].id;
    if ((id >= 300 && id < 400) || (id >= 500 && id < 600)) {
      mmh = 0.2;
    }
  }
  const w_rain = Math.min(1, mmh / 2.0);

  const clouds = typeof weather.clouds === 'number' ? weather.clouds : 50;
  const w_cloud = Math.exp(-Math.pow((clouds - 50) / 30, 2));

  const visibility = typeof weather.visibility === 'number' ? weather.visibility : 10000;
  const w_vis = Math.min(1, visibility / 10000);

  const RPS = Math.pow(w_azi, 0.4) * Math.pow(w_sun, 0.8) * Math.pow(w_rain, 1.2) * Math.pow(w_cloud, 0.6) * Math.pow(w_vis, 0.4);
  return Math.max(0, Math.min(1, RPS));
}