import { api } from './api';
import { resolveAnomaliesFromApiData } from './timetableAnomaly';

export async function fetchTimetableFromApi() {
  const ttRes = await api.get('/api/timetable');
  const data = ttRes.data?.data || {};
  const timetable =
    data.timetable &&
    typeof data.timetable === 'object' &&
    !Array.isArray(data.timetable)
      ? data.timetable
      : {};
  const subjects = Array.isArray(data.subjects)
    ? data.subjects.filter((s) => String(s || '').trim())
    : [];
  const anomalies = resolveAnomaliesFromApiData(data);

  return { timetable, subjects, anomalies };
}
