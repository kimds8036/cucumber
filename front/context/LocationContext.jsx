import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { colors, fonts } from '../styles/colors';
import {
  clearLastLocation,
  loadLastLocation,
  saveLastLocation,
} from '../utils/lastLocationCache';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [isReady, setIsReady] = useState(true);
  /** null: 아직 모름(게이트 숨김) / true / false */
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [coords, setCoordsState] = useState(null);
  const [coordsIsFresh, setCoordsIsFresh] = useState(false);
  const coordsRef = useRef(null);
  const permissionGrantedRef = useRef(false);

  /** @param {{ fresh?: boolean, persist?: boolean }} opts — fresh: GPS 확정, persist: AsyncStorage 저장 */
  const applyCoords = useCallback(
    (next, { fresh = false, persist = false } = {}) => {
      coordsRef.current = next;
      setCoordsState(next);
      setCoordsIsFresh(Boolean(next) && fresh);
      if (next && persist) {
        saveLastLocation(next);
      }
    },
    [],
  );

  useEffect(() => {
    permissionGrantedRef.current = permissionGranted === true;
  }, [permissionGranted]);

  const hydrateCoordsIfGranted = useCallback(async () => {
    if (!coordsRef.current) {
      const cached = await loadLastLocation();
      if (cached) {
        applyCoords(cached, { fresh: false });
      }
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      applyCoords(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        { fresh: true, persist: true },
      );
    } catch {
      if (!coordsRef.current) {
        setCoordsState(null);
        setCoordsIsFresh(false);
      }
    }
  }, [applyCoords]);

  const runLocationFlow = useCallback(
    async ({ requestIfNeeded = false } = {}) => {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;

      if (
        status !== Location.PermissionStatus.GRANTED &&
        requestIfNeeded
      ) {
        const asked = await Location.requestForegroundPermissionsAsync();
        status = asked.status;
      }

      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionGranted(false);
        setCoordsState(null);
        coordsRef.current = null;
        setCoordsIsFresh(false);
        await clearLastLocation();
        setIsReady(true);
        return false;
      }

      setPermissionGranted(true);
      setIsReady(true);
      await hydrateCoordsIfGranted();
      return true;
    },
    [hydrateCoordsIfGranted],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setIsReady(true);
      setPermissionGranted(null);
      setCoordsState(null);
      coordsRef.current = null;
      setCoordsIsFresh(false);
      clearLastLocation();
      return;
    }

    let cancelled = false;

    (async () => {
      const existing = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;

      if (existing.status === Location.PermissionStatus.GRANTED) {
        setPermissionGranted(true);
        setIsReady(true);
        const cached = await loadLastLocation();
        if (!cancelled && cached) {
          applyCoords(cached, { fresh: false });
        }
        if (!cancelled) {
          await hydrateCoordsIfGranted();
        }
        return;
      }

      if (existing.status === Location.PermissionStatus.UNDETERMINED) {
        const asked = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (asked.status === Location.PermissionStatus.GRANTED) {
          setPermissionGranted(true);
          setIsReady(true);
          await hydrateCoordsIfGranted();
          return;
        }
      }

      setPermissionGranted(false);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, applyCoords, hydrateCoordsIfGranted]);

  const refreshLocation = useCallback(async () => {
    if (!isLoggedIn || !permissionGrantedRef.current) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      applyCoords(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        { fresh: true, persist: true },
      );
    } catch {
      /* 캐시 좌표 유지 */
    }
  }, [isLoggedIn, applyCoords]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const c = coordsRef.current;
        if (c && permissionGrantedRef.current) {
          saveLastLocation(c);
        }
        return;
      }
      if (nextState === 'active') {
        Location.getForegroundPermissionsAsync()
          .then(({ status }) => {
            if (status === Location.PermissionStatus.GRANTED) {
              setPermissionGranted(true);
              refreshLocation();
            }
          })
          .catch(() => {});
      }
    });

    return () => sub.remove();
  }, [isLoggedIn, refreshLocation]);

  const retryPermission = useCallback(async () => {
    await runLocationFlow({ requestIfNeeded: true });
  }, [runLocationFlow]);

  const value = useMemo(
    () => ({
      isReady,
      permissionGranted,
      coords,
      coordsIsFresh,
      refreshLocation,
      retryPermission,
    }),
    [
      isReady,
      permissionGranted,
      coords,
      coordsIsFresh,
      refreshLocation,
      retryPermission,
    ],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return ctx;
}

/**
 * 권한이 거부된 뒤에만 안내 화면. 확인 중이거나 허용이면 바로 홈.
 */
export function LocationGate({ children }) {
  const { permissionGranted, retryPermission } = useLocationContext();
  const { width } = useWindowDimensions();
  const n = (size) => Math.round((width / 375) * size);

  if (permissionGranted !== false) {
    return children;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.inner, { paddingHorizontal: n(24) }]}>
        <View style={styles.hero}>
          <View
            style={[
              styles.iconCircle,
              {
                width: n(88),
                height: n(88),
                borderRadius: n(44),
                marginBottom: n(24),
              },
            ]}
          >
            <Feather name="map-pin" size={n(30)} color={colors.primaryDark} />
          </View>
          <Text
            style={[
              styles.title,
              { fontSize: n(22), lineHeight: n(30), marginBottom: n(10) },
            ]}
          >
            위치 권한이 필요해요
          </Text>
          <Text
            style={[
              styles.body,
              { fontSize: n(14), lineHeight: n(22) },
            ]}
          >
            근처 글과 거리를 보여 주려면{'\n'}위치 접근을 허용해 주세요.
          </Text>
        </View>

        <View style={[styles.actions, { paddingBottom: n(8), gap: n(10) }]}>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              {
                height: n(52),
                borderRadius: n(16),
              },
              pressed && styles.primaryPressed,
            ]}
          >
            <Text style={[styles.primaryLabel, { fontSize: n(15) }]}>
              설정에서 허용하기
            </Text>
          </Pressable>
          <Pressable
            onPress={() => retryPermission()}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              {
                height: n(52),
                borderRadius: n(16),
              },
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={[styles.secondaryLabel, { fontSize: n(15) }]}>
              권한 다시 요청
            </Text>
          </Pressable>
          <Text
            style={[
              styles.hint,
              { fontSize: n(12), lineHeight: n(18), marginTop: n(6) },
            ]}
          >
            {Platform.OS === 'android'
              ? '설정에서 위치를 “앱 사용 중에만”으로 켜 주세요.'
              : '허용한 뒤 앱으로 돌아오면 이어서 볼 수 있어요.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  inner: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight3,
  },
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.textLight6,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
  },
  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
  },
  primaryPressed: {
    opacity: 0.88,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.textLight1,
  },
  secondaryPressed: {
    backgroundColor: colors.textLight0,
  },
  primaryLabel: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
  secondaryLabel: {
    fontFamily: fonts.bold,
    color: colors.textLight8,
  },
  hint: {
    fontFamily: fonts.regular,
    color: colors.textLight4,
    textAlign: 'center',
  },
});
