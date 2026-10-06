/**
 * 공부 잔디 기록 시트 전용 — 선택한 날짜 데이터를 타이머 본문 상태와 분리해서 불러온다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadDayFromDb } from '../../../utils/timerStorage';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_TASKS,
  TIMETABLE_GRAY,
  sessionToDerivedTimelineSeconds,
} from './timerHelpers';

const EMPTY_DAY = {
  sessions: [],
  totalElapsedMs: 0,
  subjects: DEFAULT_SUBJECTS,
  tasks: DEFAULT_TASKS,
};

export function useTimerDayRecord(dayKey) {
  const [data, setData] = useState(null);
  const [loadedDayKey, setLoadedDayKey] = useState(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const requestRef = useRef(0);

  useEffect(() => {
    if (!dayKey) {
      setData(null);
      setLoadedDayKey(null);
      return undefined;
    }
    const requestId = ++requestRef.current;
    let mounted = true;
    setData(null);
    setLoadedDayKey(null);
    setCollapsedSubjects({});
    loadDayFromDb(dayKey)
      .catch(() => null)
      .then((loaded) => {
        if (!mounted || requestId !== requestRef.current) return;
        setData(
          loaded
            ? {
                sessions: loaded.sessions ?? [],
                totalElapsedMs: loaded.totalElapsedMs ?? 0,
                subjects: loaded.subjects?.length
                  ? loaded.subjects
                  : DEFAULT_SUBJECTS,
                tasks: loaded.tasks?.length ? loaded.tasks : DEFAULT_TASKS,
              }
            : EMPTY_DAY,
        );
        setLoadedDayKey(dayKey);
      });
    return () => {
      mounted = false;
    };
  }, [dayKey]);

  const day = data ?? EMPTY_DAY;

  const displaySessions = useMemo(() => {
    if (!dayKey) return [];
    return day.sessions
      .map((s) => sessionToDerivedTimelineSeconds(s, dayKey))
      .filter(Boolean);
  }, [day.sessions, dayKey]);

  const displaySubjects = useMemo(() => {
    const map = new Map();
    day.subjects.forEach((sub) => {
      if (sub?.id == null) return;
      map.set(Number(sub.id), {
        id: Number(sub.id),
        name: sub.name || `과목-${sub.id}`,
        color: sub.color || TIMETABLE_GRAY,
      });
    });
    day.sessions.forEach((s) => {
      if (s?.subjectId == null) return;
      const key = Number(s.subjectId);
      if (map.has(key)) return;
      const snapshotName = String(s?.subjectName || '').trim();
      map.set(key, {
        id: key,
        name: snapshotName
          ? `${snapshotName} (삭제됨)`
          : `(삭제됨) 과목-${s.subjectId}`,
        color: s?.subjectColor || TIMETABLE_GRAY,
      });
    });
    return Array.from(map.values());
  }, [day.subjects, day.sessions]);

  const toggleSubjectCollapsed = (subjectId) =>
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));

  return {
    loading: dayKey != null && loadedDayKey !== dayKey,
    displaySessions,
    displaySubjects,
    displayTasks: day.tasks,
    totalElapsedMs: day.totalElapsedMs,
    collapsedSubjects,
    toggleSubjectCollapsed,
  };
}
