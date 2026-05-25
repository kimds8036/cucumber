import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../styles/colors';
import { getNormalize } from '../styles/frame.style';
import { createCommuteBannerStyles } from '../styles/commute.style';
import { api } from '../utils/api';
import {
  coordsMatchSchool,
  shouldShowCommuteBanner,
} from '../utils/commuteUtils';
import {
  loadCommuteCompletedToday,
  saveCommuteCompletedToday,
} from '../utils/commuteStorage';

const DOT_COUNT = 5;
const LOCATION_POLL_MS = 15000;

function CommuteDots({ styles, activeIndex }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              opacity: i === activeIndex ? 1 : 0.28,
              transform: [{ scale: i === activeIndex ? 1.15 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * 등교 배너 (자체 노출·위치·완료 상태 관리)
 *
 * @param {{
 *   enabled?: boolean,
 *   userId?: number|string|null,
 *   viewerCoords?: { latitude: number, longitude: number } | null,
 * }} props
 *
 * 사용 예 (원하는 화면에서):
 *   <CommuteBanner viewerCoords={coords} />
 */
export default function CommuteBanner({
  enabled = true,
  userId: userIdProp = null,
  viewerCoords = null,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createCommuteBannerStyles(normalize), [normalize]);

  const [userId, setUserId] = useState(userIdProp);
  const [visible, setVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const completedRef = useRef(false);
  const schoolCoordsRef = useRef(null);
  const dotTimerRef = useRef(null);

  useEffect(() => {
    if (userIdProp != null) setUserId(userIdProp);
  }, [userIdProp]);

  useEffect(() => {
    if (!enabled || userIdProp != null) return undefined;

    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const id = res.data?.data?.id;
        if (mounted && id != null) setUserId(id);
      } catch {
        /* userId 없으면 로컬 완료 키는 anonymous */
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, userIdProp]);

  const refreshVisibility = useCallback(() => {
    setVisible(shouldShowCommuteBanner());
  }, []);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return undefined;
    }

    refreshVisibility();
    const tick = setInterval(refreshVisibility, 60 * 1000);
    return () => clearInterval(tick);
  }, [enabled, refreshVisibility]);

  useEffect(() => {
    if (!enabled) return undefined;

    let mounted = true;
    (async () => {
      if (userId != null) {
        const done = await loadCommuteCompletedToday(userId);
        if (!mounted) return;
        if (done) {
          completedRef.current = true;
          setCompleted(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, userId]);

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
        // TODO: GET /api/schools/me 응답에 학교 latitude·longitude 포함 후 위 값 사용
      } catch {
        /* 학교 좌표 없으면 위치 매칭 대기 */
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  const tryCompleteCommute = useCallback(
    async (viewerLat, viewerLng) => {
      if (completedRef.current) return;
      const school = schoolCoordsRef.current;
      if (!school) return;
      if (
        !coordsMatchSchool(
          viewerLat,
          viewerLng,
          school.latitude,
          school.longitude,
        )
      ) {
        return;
      }

      completedRef.current = true;
      setCompleted(true);
      if (userId != null) {
        await saveCommuteCompletedToday(userId);
      }
      // TODO: POST /api/attendance/check-in — 등교 출석 API 연동
    },
    [userId],
  );

  const pollLocation = useCallback(async () => {
    if (!enabled || !visible || completedRef.current) return;
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
  }, [enabled, visible, tryCompleteCommute]);

  useEffect(() => {
    if (!enabled || !visible || completed || !viewerCoords) return;
    tryCompleteCommute(viewerCoords.latitude, viewerCoords.longitude);
  }, [
    enabled,
    visible,
    completed,
    viewerCoords?.latitude,
    viewerCoords?.longitude,
    tryCompleteCommute,
  ]);

  useEffect(() => {
    if (!enabled || !visible || completed) return undefined;

    pollLocation();
    const id = setInterval(pollLocation, LOCATION_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, visible, completed, pollLocation]);

  useEffect(() => {
    if (!visible || completed) {
      if (dotTimerRef.current) clearInterval(dotTimerRef.current);
      return undefined;
    }

    dotTimerRef.current = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % DOT_COUNT);
    }, 380);

    return () => {
      if (dotTimerRef.current) clearInterval(dotTimerRef.current);
    };
  }, [visible, completed]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        {completed ? (
          <Text style={styles.completedText}>등교 완료!</Text>
        ) : (
          <View style={styles.inProgressRow}>
            <View style={styles.sideIcon}>
              <Ionicons
                name="walk"
                size={normalize(22)}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.middleTrack}>
              <CommuteDots styles={styles} activeIndex={activeDot} />
              <Text style={styles.inProgressText}>등교 중...</Text>
            </View>
            <View style={styles.sideIcon}>
              <Ionicons
                name="school"
                size={normalize(22)}
                color={colors.primaryDark}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
