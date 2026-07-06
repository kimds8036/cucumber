import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api } from '../utils/api';
import { isWithinSchoolGeofence } from '../utils/commuteGeo';
import { getCommuteDayKey, shouldShowCommuteBanner } from '../utils/commuteUtils';
import {
  loadCommuteCompletedToday,
  saveCommuteCompletedToday,
  clearCommuteCompletedToday,
} from '../utils/commuteStorage';

const LOCATION_POLL_MS = 15000;

function formatAttendanceDateYmd(value) {
  if (value == null) return '';
  const raw = typeof value === 'string' ? value.trim() : String(value);
  if (!raw) return '';
  return raw.slice(0, 10);
}

/** 서버 출석부에 오늘(KST) 기록이 있으면 true */
async function hasServerAttendanceToday() {
  const today = getCommuteDayKey();
  const month = today.slice(0, 7);
  try {
    const res = await api.get(`/api/attendance/me?month=${encodeURIComponent(month)}`);
    const rows = res.data?.data?.attendances;
    if (!Array.isArray(rows)) return false;
    return rows.some(
      (row) => formatAttendanceDateYmd(row?.attendance_date) === today,
    );
  } catch {
    return false;
  }
}

async function isCommuteCompletedToday(userId) {
  if (userId == null) return false;
  if (await loadCommuteCompletedToday(userId)) return true;
  if (await hasServerAttendanceToday()) {
    await saveCommuteCompletedToday(userId);
    return true;
  }
  return false;
}

/**
 * 등교 체크인 로직 (헤더 UI용)
 * @returns {'hidden'|'tracking'|'celebrate'} phase
 */
export function useCommuteAttendance({ enabled = true, viewerCoords = null } = {}) {
  const [phase, setPhase] = useState('hidden');
  const [activeDot, setActiveDot] = useState(0);
  const [userId, setUserId] = useState(null);
  const [bootstrapDone, setBootstrapDone] = useState(false);

  const completedRef = useRef(false);
  const schoolCoordsRef = useRef(null);
  const celebratingRef = useRef(false);

  const applyVisibility = useCallback(async () => {
    if (!enabled) {
      setPhase('hidden');
      return;
    }
    if (!shouldShowCommuteBanner()) {
      setPhase('hidden');
      return;
    }
    if (completedRef.current || celebratingRef.current) {
      setPhase('hidden');
      return;
    }
    if (userId == null) {
      setPhase('hidden');
      return;
    }

    const done = await isCommuteCompletedToday(userId);
    if (done) {
      completedRef.current = true;
      setPhase('hidden');
      return;
    }

    setPhase('tracking');
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) {
      setBootstrapDone(false);
      setPhase('hidden');
      return undefined;
    }

    let mounted = true;
    setBootstrapDone(false);
    setPhase('hidden');

    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const id = res.data?.data?.id;
        if (!mounted) return;

        if (id == null) {
          return;
        }

        setUserId(id);

        if (!shouldShowCommuteBanner()) {
          return;
        }

        const done = await isCommuteCompletedToday(id);
        if (!mounted) return;

        if (done) {
          completedRef.current = true;
          setPhase('hidden');
        } else if (!celebratingRef.current) {
          setPhase('tracking');
        }
      } catch {
        if (mounted) setPhase('hidden');
      } finally {
        if (mounted) setBootstrapDone(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !bootstrapDone) return undefined;

    const tick = setInterval(applyVisibility, 60 * 1000);
    return () => clearInterval(tick);
  }, [enabled, bootstrapDone, applyVisibility]);

  useEffect(() => {
    if (!enabled) return undefined;

    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/schools/me');
        const data = res.data?.data;
        if (!mounted || !data) return;
        const lat = data.latitude ?? data.lat ?? null;
        const lng = data.longitude ?? data.lng ?? null;
        if (lat != null && lng != null) {
          schoolCoordsRef.current = {
            latitude: Number(lat),
            longitude: Number(lng),
          };
        }
      } catch {
        /* 학교 좌표 없으면 매칭 대기 */
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  const beginCelebrate = useCallback(async () => {
    celebratingRef.current = true;
    completedRef.current = true;
    setPhase('celebrate');
    if (userId != null) {
      await saveCommuteCompletedToday(userId);
    }
  }, [userId]);

  const tryCompleteCommute = useCallback(
    async (viewerLat, viewerLng) => {
      if (completedRef.current || celebratingRef.current) return;
      if (!bootstrapDone) return;
      const school = schoolCoordsRef.current;
      if (!school) return;
      if (
        !isWithinSchoolGeofence(
          viewerLat,
          viewerLng,
          school.latitude,
          school.longitude,
        )
      ) {
        return;
      }

      await beginCelebrate();
      try {
        await api.post('/api/attendance/check-in', {
          latitude: viewerLat,
          longitude: viewerLng,
        });
      } catch (err) {
        if (err?.response?.status === 409) {
          if (userId != null) {
            await saveCommuteCompletedToday(userId);
          }
          return;
        }
        celebratingRef.current = false;
        completedRef.current = false;
        setPhase('tracking');
        if (userId != null) {
          await clearCommuteCompletedToday(userId);
        }
        console.warn(
          '[CommuteHeader] check-in failed',
          err?.response?.data || err.message,
        );
      }
    },
    [beginCelebrate, userId, bootstrapDone],
  );

  const pollLocation = useCallback(async () => {
    if (!enabled || phase !== 'tracking' || completedRef.current) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await tryCompleteCommute(pos.coords.latitude, pos.coords.longitude);
    } catch {
      /* GPS 실패 시 등교 중 상태 유지 */
    }
  }, [enabled, phase, tryCompleteCommute]);

  useEffect(() => {
    if (!enabled || phase !== 'tracking' || !viewerCoords) return;
    tryCompleteCommute(viewerCoords.latitude, viewerCoords.longitude);
  }, [
    enabled,
    phase,
    viewerCoords?.latitude,
    viewerCoords?.longitude,
    tryCompleteCommute,
  ]);

  useEffect(() => {
    if (!enabled || phase !== 'tracking') return undefined;

    pollLocation();
    const id = setInterval(pollLocation, LOCATION_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, phase, pollLocation]);

  useEffect(() => {
    if (phase !== 'tracking') return undefined;

    const id = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 550);

    return () => clearInterval(id);
  }, [phase]);

  const dismissAfterCelebrate = useCallback(() => {
    celebratingRef.current = false;
    setPhase('hidden');
  }, []);

  return {
    phase,
    activeDot,
    dismissAfterCelebrate,
  };
}
