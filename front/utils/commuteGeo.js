const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** 두 좌표 간 거리(m) — 백엔드 haversineMeters와 동일 공식 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLng = Number(lon1);
  const bLat = Number(lat2);
  const bLng = Number(lon2);
  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng)
  ) {
    return Infinity;
  }

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const φ1 = toRad(aLat);
  const φ2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

/** 등교 인정 반경(m) — 앱·백엔드 공통 고정값 */
export const COMMUTE_GEOFENCE_METERS = 300;

export function getCommuteGeofenceMeters() {
  return COMMUTE_GEOFENCE_METERS;
}

export function isWithinSchoolGeofence(
  viewerLat,
  viewerLng,
  schoolLat,
  schoolLng,
  maxMeters = getCommuteGeofenceMeters(),
) {
  const distance = haversineMeters(viewerLat, viewerLng, schoolLat, schoolLng);
  return distance <= maxMeters;
}
