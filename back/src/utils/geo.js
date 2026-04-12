/**
 * 두 좌표 간 대권 거리(km). WGS84 근사(Haversine).
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

/** MySQL WHERE 절용 Haversine(km) — 플레이스홀더 순서: viewerLat, viewerLat, viewerLng */
export function sqlHaversineKmLessOrEqual(alias = 'p') {
  return `(6371 * ACOS(LEAST(1, GREATEST(-1,
    SIN(RADIANS(?)) * SIN(RADIANS(${alias}.latitude))
    + COS(RADIANS(?)) * COS(RADIANS(${alias}.latitude))
    * COS(RADIANS(${alias}.longitude) - RADIANS(?))
  )))) <= ?`;
}
