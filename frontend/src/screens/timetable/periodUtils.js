export function getMaxPeriodFromTimetableKeys(timetable, defaultPeriod = 7) {
  const safeDefault = Number(defaultPeriod) > 0 ? Number(defaultPeriod) : 7;
  if (!timetable || typeof timetable !== 'object') return safeDefault;

  let maxPeriod = 0;
  Object.keys(timetable).forEach((key) => {
    if (typeof key !== 'string') return;
    const match = key.match(/-(\d+)$/);
    if (!match) return;
    const period = Number(match[1]);
    if (!Number.isFinite(period) || period <= 0) return;
    if (period > maxPeriod) maxPeriod = period;
  });

  return maxPeriod > 0 ? maxPeriod : safeDefault;
}
