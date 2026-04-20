export function isStudySummaryNotification(notification) {
  const relatedType = String(notification?.relatedType ?? '').trim();
  const type = String(notification?.type ?? '').trim();
  return (
    relatedType === 'friend_study_finished_summary' ||
    relatedType === 'friend_study_finished_summary_single' ||
    relatedType === 'friend_study_finished_summary_multi' ||
    relatedType === 'study_summary_single' ||
    relatedType === 'study_summary_multi' ||
    type === 'study_finished_summary'
  );
}

export function normalizeStudySummaryWatchers(watchers) {
  if (!Array.isArray(watchers)) return [];
  return watchers
    .map((w, idx) => {
      if (!w || typeof w !== 'object') return null;
      const name = String(w.name ?? w.username ?? '').trim();
      const idRaw = w.userId ?? w.id ?? null;
      const userId = idRaw == null ? null : String(idRaw).trim();
      const colorIdRaw = w.colorId ?? w.profileColorId ?? w.profile_color_id ?? null;
      const colorIdNum = Number(colorIdRaw);
      const colorId = Number.isFinite(colorIdNum) ? colorIdNum : null;
      if (!name && !userId) return null;
      return {
        userId: userId || `watcher-${idx}`,
        name: name || '이름 없음',
        colorId,
      };
    })
    .filter(Boolean);
}
