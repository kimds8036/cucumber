/**
 * [테스트 로그인할 때 썼던 화면 — 현재 App.js AuthStack 에서 연결 해제됨]
 *
 * 테스트 빌드 전용 진입 화면이었음.
 * - 백엔드 /api/test/users 에서 user1~userN 목록을 가져와 표시
 * - 계정 클릭 시 매칭 비밀번호(passN) 로 자동 로그인
 * - 우상단 "관리자 로그인" → Login 화면
 *
 * 다시 쓰려면 App.js 에서 TestLogin import·Stack.Screen·initialRouteName 복구.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../assets/Logo.svg';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api, setAuthToken, getApiUserFacingMessage } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const TestLogin = ({ navigation }) => {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createStyles(width, normalize), [width]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loginInFlight, setLoginInFlight] = useState(null);
  const [autoLogin, setAutoLogin] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/test/users');
      const list = res?.data?.data?.users || [];
      setUsers(list);
    } catch (e) {
      console.warn('[TestLogin] 사용자 목록 조회 실패:', e?.message);
      Alert.alert('오류', '테스트 계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const deriveTestPassword = (username) => {
    // user1 → pass1 / user12 → pass12 ...
    const m = String(username || '').match(/^([a-zA-Z_]+)(\d+)$/);
    if (!m) return null;
    return `pass${m[2]}`;
  };

  const handleSelectUser = async (user) => {
    if (loginInFlight) return;
    const password = deriveTestPassword(user.username);
    if (!password) {
      Alert.alert('알림', '비밀번호 패턴을 확인할 수 없습니다.');
      return;
    }
    try {
      setLoginInFlight(user.id);
      const response = await api.post('/api/auth/login', {
        username: user.username,
        password,
      });
      const { token } = response?.data?.data || {};
      if (token) {
        await setAuthToken(token, { persist: autoLogin });
      }
      login();
    } catch (error) {
      const msg = getApiUserFacingMessage(error, '로그인에 실패했습니다.');
      Alert.alert('로그인 실패', msg);
    } finally {
      setLoginInFlight(null);
    }
  };

  const renderItem = ({ item }) => {
    const isLoggingIn = loginInFlight === item.id;
    const inUse = !!item.in_use;
    return (
      <TouchableOpacity
        style={[styles.userRow, isLoggingIn && styles.userRowDisabled]}
        onPress={() => handleSelectUser(item)}
        disabled={!!loginInFlight}
        activeOpacity={0.85}
      >
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userHandle}> @{item.username}</Text>
          </View>
        </View>

        <View style={styles.statusWrap}>
          {isLoggingIn ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: inUse ? '#E53935' : '#2E7D32' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: inUse ? '#E53935' : '#2E7D32' },
                ]}
              >
                {inUse ? '사용중' : '대기중'}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.logoWrap}>
          <LogoIcon
            width={normalize(60)}
            height={normalize(60)}
            color={colors.primary}
          />
          <Text style={styles.appTitle}>YOUTH PAPER</Text>
          <Text style={styles.testBadge}>TEST</Text>
        </View>

        <TouchableOpacity
          style={styles.adminButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={normalize(14)}
            color={colors.primaryDark}
          />
          <Text style={styles.adminButtonText}>관리자 로그인</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>테스트 로그인 세션</Text>

        {/* 자동 로그인 체크박스 — 체크해야 다음 부팅에서 자동로그인 */}
        <TouchableOpacity
          style={styles.autoLoginRow}
          onPress={() => setAutoLogin((prev) => !prev)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={[
              styles.autoLoginBox,
              autoLogin && styles.autoLoginBoxChecked,
            ]}
          >
            {autoLogin && (
              <Ionicons name="checkmark" size={normalize(12)} color="#fff" />
            )}
          </View>
          <Text style={styles.autoLoginText}>자동 로그인</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>표시할 테스트 계정이 없습니다.</Text>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (width, normalize) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSection: {
    paddingHorizontal: width * 0.05,
    paddingTop: normalize(8),
    paddingBottom: normalize(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    marginLeft: normalize(8),
    fontSize: normalize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  testBadge: {
    marginLeft: normalize(8),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(2),
    fontSize: normalize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: '#fff',
    backgroundColor: '#E53935',
    borderRadius: normalize(8),
    overflow: 'hidden',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    backgroundColor: colors.primaryLight20,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: normalize(4),
  },
  adminButtonText: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingTop: normalize(12),
    paddingBottom: normalize(8),
  },
  sectionTitle: {
    fontSize: normalize(fontSizes.title),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  autoLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoLoginBox: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(4),
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(6),
  },
  autoLoginBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  autoLoginText: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: width * 0.05,
    paddingBottom: normalize(40),
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: normalize(14),
    paddingHorizontal: normalize(8),
    borderRadius: normalize(12),
  },
  userRowDisabled: {
    opacity: 0.6,
  },
  userInfo: {
    flex: 1,
    paddingRight: normalize(12),
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  userName: {
    fontSize: normalize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    minWidth: normalize(60),
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    marginRight: normalize(4),
  },
  statusText: {
    fontSize: normalize(fontSizes.md),
    fontFamily: fonts.bold,
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: normalize(40),
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: normalize(fontSizes.lg),
  },
});

export default TestLogin;
