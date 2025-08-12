const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_M = 6371000;

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dphi = (lat2 - lat1) * DEG2RAD;
  const dlambda = (lon2 - lon1) * DEG2RAD;

  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function computeBearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dlambda = (lon2 - lon1) * DEG2RAD;
  const y = Math.sin(dlambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dlambda);
  const bearing = Math.atan2(y, x) * RAD2DEG;
  return (bearing + 360) % 360; // from North, clockwise
}

export function offsetMetersToLatLon(lat: number, lon: number, dxMeters: number, dyMeters: number): { lat: number; lon: number } {
  const dLat = (dyMeters / EARTH_RADIUS_M) * RAD2DEG;
  const dLon = (dxMeters / (EARTH_RADIUS_M * Math.cos(lat * DEG2RAD))) * RAD2DEG;
  return { lat: lat + dLat, lon: lon + dLon };
}

export function buildGridAround(centerLat: number, centerLon: number, radiusMeters: number, spacingMeters: number): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  const steps = Math.ceil((radiusMeters * 2) / spacingMeters);
  const half = Math.floor(steps / 2);
  for (let iy = -half; iy <= half; iy++) {
    for (let ix = -half; ix <= half; ix++) {
      const dx = ix * spacingMeters;
      const dy = iy * spacingMeters;
      const dist = Math.hypot(dx, dy);
      if (dist <= radiusMeters) {
        points.push(offsetMetersToLatLon(centerLat, centerLon, dx, dy));
      }
    }
  }
  return points;
}