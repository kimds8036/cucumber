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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

  if (permissionGranted !== false) {
    return children;
  }

  return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 18,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          위치 권한이 필요해요
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          게시판 거리·근처 글 보기를 위해 위치 접근을 허용해 주세요. 설정에서
          권한을 켠 뒤 앱으로 돌아오면 계속할 수 있어요.
        </Text>
        <TouchableOpacity
          onPress={() => retryPermission()}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              color: colors.textPrimary,
              fontSize: 15,
            }}
          >
            권한 다시 요청
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, color: '#fff', fontSize: 16 }}>
            설정 열기
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'android' ? (
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            일부 기기에서는 위치 권한을 “앱 사용 중에만”으로 설정해 주세요.
          </Text>
        ) : null}
      </View>
  );
}
