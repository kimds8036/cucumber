import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { colors, fonts } from '../styles/colors';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [coords, setCoords] = useState(null);

  const runLocationFlow = useCallback(async () => {
    setIsReady(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      setPermissionGranted(false);
      setCoords(null);
      setIsReady(true);
      return;
    }
    setPermissionGranted(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setCoords(null);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsReady(true);
      setPermissionGranted(false);
      setCoords(null);
      return;
    }
    runLocationFlow();
  }, [isLoggedIn, runLocationFlow]);

  const refreshLocation = useCallback(async () => {
    if (!isLoggedIn || !permissionGranted) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setCoords(null);
    }
  }, [isLoggedIn, permissionGranted]);

  const retryPermission = useCallback(async () => {
    await runLocationFlow();
  }, [runLocationFlow]);

  const value = useMemo(
    () => ({
      isReady,
      permissionGranted,
      coords,
      refreshLocation,
      retryPermission,
    }),
    [isReady, permissionGranted, coords, refreshLocation, retryPermission],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
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
 * 로그인 후 메인 앱 진입 시 위치 권한이 없으면 앱 사용을 막습니다.
 * 권한은 있으나 좌표 획득 실패 시에는 메인 진입을 허용하고 coords 만 null 입니다.
 */
export function LocationGate({ children }) {
  const { isReady, permissionGranted, retryPermission } = useLocationContext();

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            marginTop: 16,
            fontFamily: fonts.regular,
            color: colors.textSecondary,
          }}
        >
          위치 권한을 확인하는 중이에요…
        </Text>
      </View>
    );
  }

  if (!permissionGranted) {
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
          게시판 거리·근처 글 보기를 위해 위치 접근을 허용해 주세요. 설정에서 권한을 켠 뒤
          앱으로 돌아오면 계속할 수 있어요.
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
          <Text style={{ fontFamily: fonts.bold, color: colors.textPrimary, fontSize: 15 }}>
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
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary }}>
            일부 기기에서는 위치 권한을 “앱 사용 중에만”으로 설정해 주세요.
          </Text>
        ) : null}
      </View>
    );
  }

  return children;
}
