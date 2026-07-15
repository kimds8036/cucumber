import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { api, getApiBaseUrlNoSlash } from '../../utils/api';
import { colors, fonts } from '../../styles/colors';
import { getStoreUrlForPlatform } from '../../utils/shareLinks';

function getAppVersion() {
  const v =
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    '';
  return String(v).trim();
}

function isProductionBackend() {
  return /production/i.test(getApiBaseUrlNoSlash());
}

export default function ForceUpdateGate({ children, onPhaseChange }) {
  const [phase, setPhase] = useState('checking');
  const [storeUrl, setStoreUrl] = useState('');
  const [minVersion, setMinVersion] = useState('');

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const runCheck = useCallback(async () => {
    if (__DEV__) {
      setPhase('ok');
      return;
    }

    setPhase('checking');
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const version = getAppVersion();
      const res = await api.get('/api/app/version-check', {
        params: { platform, version },
        timeout: 12000,
      });
      const data = res?.data?.data;
      if (data?.forceUpdate) {
        setStoreUrl(String(data.storeUrl || '').trim());
        setMinVersion(String(data.minVersion || '').trim());
        setPhase('force');
        return;
      }
      setPhase('ok');
    } catch {
      setPhase(isProductionBackend() ? 'error' : 'ok');
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const openStore = () => {
    const url = storeUrl || getStoreUrlForPlatform();
    Linking.openURL(url).catch(() => {});
  };

  if (phase === 'ok') return children;

  // 버전 확인 중 UI는 네이티브 스플래시로 대체 (로딩 문구·스피너 비표시)
  if (phase === 'checking') {
    /*
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primaryDark} />
        <Text
          style={{
            marginTop: 16,
            fontFamily: fonts.regular,
            color: colors.textSecondary,
          }}
        >
          앱 버전을 확인하는 중이에요…
        </Text>
      </View>
    );
    */
    return null;
  }

  if (phase === 'force') {
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
            fontSize: 20,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          업데이트가 필요해요
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {minVersion
            ? `최소 버전 ${minVersion} 이상이 필요합니다.\n현재 버전: ${getAppVersion() || '알 수 없음'}`
            : '스토어에서 최신 버전으로 업데이트한 뒤 다시 실행해 주세요.'}
        </Text>
        <Pressable
          onPress={openStore}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            스토어에서 업데이트
          </Text>
        </Pressable>
      </View>
    );
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
        버전 확인에 실패했어요
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24,
        }}
      >
        네트워크 상태를 확인한 뒤 다시 시도해 주세요.
      </Text>
      <Pressable
        onPress={runCheck}
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 16,
            color: colors.textPrimary,
          }}
        >
          다시 시도
        </Text>
      </Pressable>
    </View>
  );
}
