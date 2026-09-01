import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SubHeader from '../frame/subHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api, setAuthToken, setRefreshToken, getOrCreateDeviceId } from '../../utils/api';
import {
  getAppLockEnabled,
  getBiometricEnabled,
  setAppLockEnabled,
  setBiometricEnabled,
} from '../../utils/appLockStorage';
import {
  authenticateWithBiometrics,
  checkBiometricAvailability,
} from '../../utils/biometrics';
import { useAppLock } from '../../context/AppLockContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../styles/colors';
import {
  getNormalize,
  createNotificationSettingsStyles,
  themedTextInputProps,
} from '../../styles/mypage.style';
import {
  patchMypageProfileCache,
  readAccountProfileCache,
  writeAccountProfileCache,
  meToAccountCache,
} from '../../utils/mypageProfileCache';

const PROFILE_CHANGE_DONE_TITLE = '변경완료';
const PROFILE_CHANGE_DONE_MESSAGE = '변경완료 되었습니다.';

const NOTIFICATION_ITEMS = [
  { key: 'newComment', label: '게시글 댓글' },
  { key: 'friendRequest', label: '친구 요청' },
  { key: 'mailOutgoing', label: '우편 발신' },
  {
    key: 'promo',
    label: '시스템 알림',
    subtitle: '인기 게시글, 광고성 정보 등',
    isPromo: true,
  },
];

const APP_LOCK_ITEMS = [
  { key: 'changePin', label: '암호 변경' },
];

const SETTINGS_PREFS_CACHE_KEY = '@settings_prefs_cache_v1';

function clampBoardDistanceKm(value, fallback = 10) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.round(n)));
}

async function readSettingsPrefsCache() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_PREFS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSettingsPrefsCache(payload) {
  try {
    await AsyncStorage.setItem(
      SETTINGS_PREFS_CACHE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // ignore
  }
}

const Settings = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createNotificationSettingsStyles(normalize),
    [normalize],
  );

  /** 마이페이지에서 분리 진입: 'prefs' 알림·거리만, 'profile' 아이디·비밀번호·학교만, 없으면 전체 */
  const variant = route?.params?.variant;
  const showPrefs = variant !== 'profile';
  const showProfile = variant !== 'prefs';
  const headerTitle = variant === 'profile' ? '계정 관리' : '앱 설정';

  const navigateToMypage = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { initialTab: 'mypage' } }],
    });
  };

  const showProfileChangeDone = (afterCache) => {
    Alert.alert(PROFILE_CHANGE_DONE_TITLE, PROFILE_CHANGE_DONE_MESSAGE, [
      {
        text: '확인',
        onPress: async () => {
          if (afterCache) await afterCache();
          navigateToMypage();
        },
      },
    ]);
  };
  // ── 알림 설정 ──
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    newPost: true,
    newComment: true,
    newLike: false,
    announcement: true,
    friendRequest: true,
    mailOutgoing: true,
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  // ── 앱 기본 설정 (로컬) ──
  const darkModeEnabled = false;
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailability, setBiometricAvailability] = useState({
    available: false,
    type: 'none',
  });
  const { refreshFromStorage } = useAppLock();
  const { showToast } = useToast();

  const loadLocalPrefs = async () => {
    const [appLock, biometric, availability] = await Promise.all([
      getAppLockEnabled(),
      getBiometricEnabled(),
      checkBiometricAvailability(),
    ]);
    setAppLockEnabledState(appLock);
    setBiometricAvailability(availability);
    setBiometricEnabledState(biometric && availability.available);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadLocalPrefs();
    }, []),
  );

  const hydrateAccountProfile = React.useCallback(async (me) => {
    if (!me) return;
    const school = me.school?.name || '';
    setSchoolName(school);
    if (me.grade != null) setGradeInput(String(me.grade));
    if (me.classNumber != null) setClassInput(String(me.classNumber));
    if (me.username) {
      setCurrentUsername(`@${String(me.username).replace(/^@+/, '')}`);
    }
    await writeAccountProfileCache(meToAccountCache(me));
    setProfileHydrated(true);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!showProfile) return undefined;
      let mounted = true;
      (async () => {
        const cached = await readAccountProfileCache();
        if (!mounted) return;
        if (cached) {
          setSchoolName(cached.school || '');
          if (cached.grade != null) setGradeInput(String(cached.grade));
          if (cached.classNumber != null) {
            setClassInput(String(cached.classNumber));
          }
          if (cached.username) {
            setCurrentUsername(
              `@${String(cached.username).replace(/^@+/, '')}`,
            );
          }
          setProfileHydrated(true);
        }
        try {
          const res = await api.get('/api/auth/me');
          if (!mounted) return;
          await hydrateAccountProfile(res.data?.data);
        } catch (err) {
          console.warn('계정 프로필 불러오기 실패:', err);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [showProfile, hydrateAccountProfile]),
  );

  const showDarkModeComingSoon = () => {
    showToast('개발 중인 기능입니다.');
  };

  const handleAppLockToggle = async (value) => {
    if (value) {
      navigation.navigate('SetPinScreen', { mode: 'set' });
      return;
    }
    setAppLockEnabledState(false);
    setBiometricEnabledState(false);
    await setAppLockEnabled(false);
    await refreshFromStorage();
  };

  const handleBiometricToggle = async () => {
    const next = !biometricEnabled;
    if (!next) {
      setBiometricEnabledState(false);
      await setBiometricEnabled(false);
      return;
    }
    if (!biometricAvailability.available) return;

    const result = await authenticateWithBiometrics(
      '생체 인증을 사용하려면 본인 확인이 필요합니다',
    );
    if (result.success) {
      setBiometricEnabledState(true);
      await setBiometricEnabled(true);
    }
  };

  const handleChangePin = () => {
    navigation.navigate('VerifyPinScreen');
  };

  const persistPrefsCache = (distance, notif) => {
    writeSettingsPrefsCache({
      distanceKm: clampBoardDistanceKm(distance),
      notifications: notif,
    });
  };

  const syncSettingsToServer = async (next) => {
    persistPrefsCache(next.distanceKm, {
      pushEnabled: next.pushEnabled,
      newPost: next.newPost,
      newComment: next.newComment,
      newLike: next.newLike,
      announcement: next.announcement,
      friendRequest: next.friendRequest,
      mailOutgoing: next.mailOutgoing,
    });
    try {
      await api.put('/api/settings', {
        pushEnabled: next.pushEnabled,
        newPost: next.newPost,
        newComment: next.newComment,
        newLike: next.newLike,
        announcement: next.announcement,
        friendRequest: next.friendRequest,
        mailOutgoing: next.mailOutgoing,
        boardDistanceKm: next.distanceKm,
        lastUsernameChangeAt: next.lastIdChangeAt,
      });
    } catch (error) {
      console.error('설정 동기화 실패:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      try {
        setLoadingSettings(true);
        const cached = await readSettingsPrefsCache();
        if (!mounted) return;
        if (cached) {
          if (cached.notifications && typeof cached.notifications === 'object') {
            setNotifications((prev) => ({ ...prev, ...cached.notifications }));
          }
          if (cached.distanceKm != null) {
            setDistanceKm(clampBoardDistanceKm(cached.distanceKm));
          }
          setSettingsHydrated(true);
        }

        const results = await Promise.allSettled([
          api.get('/api/settings'),
          api.get('/api/auth/me'),
        ]);

        if (!mounted) return;

        if (results[1].status === 'fulfilled') {
          const me = results[1].value.data?.data;
          if (me) {
            setCurrentUsername(me.username ? `@${me.username}` : '');
            if (showProfile) {
              void hydrateAccountProfile(me);
            }
          }
        }

        if (results[0].status === 'fulfilled') {
          const data = results[0].value.data?.data;
          if (data) {
            setNotifications({
              pushEnabled: !!data.pushEnabled,
              newPost: !!data.newPost,
              newComment: !!data.newComment,
              newLike: !!data.newLike,
              announcement: !!data.announcement,
              friendRequest: data.friendRequest !== false,
              mailOutgoing: data.mailOutgoing !== false,
            });
            setDistanceKm(clampBoardDistanceKm(data.boardDistanceKm, 10));
            persistPrefsCache(data.boardDistanceKm, {
              pushEnabled: !!data.pushEnabled,
              newPost: !!data.newPost,
              newComment: !!data.newComment,
              newLike: !!data.newLike,
              announcement: !!data.announcement,
              friendRequest: data.friendRequest !== false,
              mailOutgoing: data.mailOutgoing !== false,
            });
            if (data.lastUsernameChangeAt) {
              setLastIdChangeAt(data.lastUsernameChangeAt);
            }
          }
        } else {
          console.error('설정 불러오기 실패:', results[0].reason);
        }
        if (results[1].status === 'rejected') {
          console.warn('프로필(아이디) 불러오기 실패:', results[1].reason);
        }
      } catch (error) {
        console.error('설정 화면 로드 실패:', error);
      } finally {
        if (mounted) {
          setDistanceKm((prev) => (prev == null ? 10 : prev));
          setSettingsHydrated(true);
          setLoadingSettings(false);
        }
      }
    };
    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      syncSettingsToServer({
        ...next,
        distanceKm: clampBoardDistanceKm(distanceKm),
        lastIdChangeAt,
      });
      return next;
    });
  };

  const togglePromo = () => {
    setNotifications((prev) => {
      const on = prev.newPost && prev.newLike && prev.announcement;
      const nextVal = !on;
      const next = {
        ...prev,
        newPost: nextVal,
        newLike: nextVal,
        announcement: nextVal,
      };
      syncSettingsToServer({
        ...next,
        distanceKm: clampBoardDistanceKm(distanceKm),
        lastIdChangeAt,
      });
      return next;
    });
  };

  // ── 게시판 거리 설정 (1~100km) ──
  const [distanceKm, setDistanceKm] = useState(null);
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);

  const displayDistanceKm = clampBoardDistanceKm(distanceKm, 10);
  const distancePercent = ((displayDistanceKm - 1) / 99) * 100;

  const updateDistanceFromPageX = (pageX) => {
    if (trackWidthRef.current <= 0) return;
    const relativeX = pageX - trackXRef.current;
    const percent = Math.max(0, Math.min(1, relativeX / trackWidthRef.current));
    const km = Math.round(1 + percent * 99);
    setDistanceKm(km);
    syncSettingsToServer({
      ...notifications,
      distanceKm: km,
      lastIdChangeAt,
    });
  };

  const distancePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) =>
        updateDistanceFromPageX(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) =>
        updateDistanceFromPageX(evt.nativeEvent.pageX),
    }),
  ).current;

  const handleDistanceTrackLayout = (e) => {
    const { width, x } = e.nativeEvent.layout;
    trackWidthRef.current = width;
    // layout의 x는 부모 기준이므로 measureInWindow로 절대 좌표를 구함
    e.target.measureInWindow((absX) => {
      trackXRef.current = absX;
    });
  };

  // ── 비밀번호 변경 ──
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const handlePasswordChange = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      Alert.alert('입력 오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (pwForm.next.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await api.patch('/api/auth/me/password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
        deviceId,
      });
      const nextToken = res.data?.data?.token;
      const nextRefresh = res.data?.data?.refreshToken;
      if (nextToken) {
        await setAuthToken(nextToken, { persist: true });
      }
      if (nextRefresh) {
        await setRefreshToken(nextRefresh, { persist: true });
      }
      setPwForm({ current: '', next: '', confirm: '' });
      showProfileChangeDone(async () => {
        await patchMypageProfileCache({});
      });
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message || '비밀번호 변경에 실패했습니다.',
      );
    }
  };
  const canSubmitPasswordChange =
    !!pwForm.current &&
    !!pwForm.next &&
    !!pwForm.confirm &&
    pwForm.next === pwForm.confirm &&
    pwForm.next.length >= 8;
  const passwordGuideText = !pwForm.current
    ? '현재 비밀번호를 입력해주세요.'
    : !pwForm.next
      ? '새 비밀번호를 입력해주세요.'
      : pwForm.next.length < 8
        ? '새 비밀번호는 8자 이상이어야 합니다.'
        : !pwForm.confirm
          ? '새 비밀번호 확인을 입력해주세요.'
          : pwForm.next !== pwForm.confirm
            ? '새 비밀번호 확인이 일치하지 않습니다.'
            : '';

  // ── 아이디 변경 (6개월에 1번) ──
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [lastIdChangeAt, setLastIdChangeAt] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [classInput, setClassInput] = useState('');
  const [profileHydrated, setProfileHydrated] = useState(false);

  const getNextChangeDate = () => {
    if (!lastIdChangeAt) return null;
    const d = new Date(lastIdChangeAt);
    d.setMonth(d.getMonth() + 6);
    return d;
  };
  const nextChangeDate = getNextChangeDate();
  const canChangeId = nextChangeDate === null || new Date() >= nextChangeDate;

  const handleNewUsernameChange = (text) => {
    setNewUsername(String(text).replace(/^@+/, ''));
  };

  const handleIdChange = async () => {
    const body = newUsername.trim().replace(/^@+/, '');
    const trimmed = `@${body}`;
    if (!body) {
      Alert.alert('입력 오류', '새 아이디를 입력해주세요.');
      return;
    }
    if (trimmed.length < 4) {
      Alert.alert('입력 오류', '아이디는 4자 이상이어야 합니다.');
      return;
    }
    if (trimmed === currentUsername) {
      Alert.alert('입력 오류', '현재와 동일한 아이디입니다.');
      return;
    }
    if (!canChangeId) {
      Alert.alert(
        '변경 제한',
        `아이디는 6개월에 1번만 변경할 수 있습니다.\n다음 변경 가능일: ${nextChangeDate.toLocaleDateString('ko-KR')}`,
      );
      return;
    }
    try {
      const res = await api.patch('/api/auth/me/username', {
        username: trimmed,
      });
      const changedUsername = res.data?.data?.username;
      const changedAt =
        res.data?.data?.lastUsernameChangeAt || new Date().toISOString();
      if (changedUsername) {
        setCurrentUsername(`@${changedUsername}`);
      } else {
        setCurrentUsername(trimmed.startsWith('@') ? trimmed : `@${trimmed}`);
      }
      setNewUsername('');
      setLastIdChangeAt(changedAt);
      const normalizedUsername = changedUsername || body;
      showProfileChangeDone(async () => {
        await patchMypageProfileCache({ username: normalizedUsername });
      });
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message || '아이디 변경에 실패했습니다.',
      );
    }
  };

  const canSubmitAcademicChange = (() => {
    const grade = Number(gradeInput);
    const classNumber = Number(classInput);
    return (
      profileHydrated &&
      Number.isFinite(grade) &&
      grade >= 1 &&
      grade <= 6 &&
      Number.isFinite(classNumber) &&
      classNumber >= 1 &&
      classNumber <= 50
    );
  })();

  const handleAcademicChange = async () => {
    const grade = Number(gradeInput);
    const classNumber = Number(classInput);
    if (!canSubmitAcademicChange) {
      Alert.alert('입력 오류', '학년(1~6)과 반(1~50)을 올바르게 입력해 주세요.');
      return;
    }
    try {
      await api.patch('/api/auth/me/academic', { grade, classNumber });
      await writeAccountProfileCache({
        school: schoolName,
        grade,
        classNumber,
        username: currentUsername.replace(/^@+/, ''),
      });
      showProfileChangeDone(async () => {
        await patchMypageProfileCache({
          school: schoolName,
          grade,
          classNumber,
        });
      });
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message || '학년·반 변경에 실패했습니다.',
      );
    }
  };

  // ── 공통 컴포넌트 ──
  const SectionHeader = ({ icon, title, Icon = Ionicons, description }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTopRow}>
        <Icon name={icon} size={normalize(20)} color={colors.primary} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
      {description ? (
        <Text style={styles.sectionHeaderDescription}>{description}</Text>
      ) : null}
    </View>
  );

  const NotificationRow = ({
    title,
    subtitle,
    value,
    onToggle,
    disabled,
    onDisabledPress,
    titleBold = false,
  }) => (
    <View style={[styles.notifRow, disabled && styles.notifRowDisabled]}>
      <View style={styles.notifLeft}>
        <Text
          style={[
            titleBold ? styles.notifTitleBold : styles.notifTitle,
            disabled && styles.textDisabled,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.notifSubtitle, disabled && styles.textDisabled]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.notifSwitchWrap}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDisabledPress}
          disabled={!disabled || !onDisabledPress}
        >
          <Switch
            value={value}
            onValueChange={onToggle}
            disabled={disabled}
            pointerEvents={disabled ? 'none' : 'auto'}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textWhite}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const AppLockItemRow = ({ title, subtitle, onPress, disabled }) => (
    <TouchableOpacity
      style={[styles.notifRow, disabled && styles.notifRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.notifLeft}>
        <Text
          style={[styles.notifTitle, disabled && styles.textDisabled]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.notifSubtitle, disabled && styles.textDisabled]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={normalize(20)}
        color={disabled ? colors.textLight20 : colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderPwInput = ({ label, fieldKey, density }) => (
    <View
      style={
        density === 'first'
          ? styles.pwFieldFirst
          : density === 'middle'
            ? styles.pwFieldMiddle
            : density === 'last'
              ? styles.pwFieldLast
              : styles.pwField
      }
    >
      <Text style={styles.pwLabel}>{label}</Text>
      <View style={styles.pwInputWrap}>
        <TextInput
          style={styles.pwInput}
          value={pwForm[fieldKey]}
          onChangeText={(v) =>
            setPwForm((prev) => ({ ...prev, [fieldKey]: v }))
          }
          secureTextEntry={!showPw[fieldKey]}
          placeholder="입력하세요"
          {...themedTextInputProps}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() =>
            setShowPw((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
          }
        >
          <Ionicons
            name={showPw[fieldKey] ? 'eye-off-outline' : 'eye-outline'}
            size={normalize(20)}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // thumb 위치: 퍼센트를 픽셀로 환산 (트랙 너비를 알아야 정확하지만, translateX로 대응)
  const thumbLeftPercent = distancePercent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title={headerTitle} onBack={() => navigation.goBack()} />

      <KeyboardAwareScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={normalize(16)}
      >
        {showPrefs && (
          <>
            {/* ────────────── 알림 설정 ────────────── */}
            <SectionHeader
              icon="notifications-outline"
              title="알림 설정"
              description="모든 알림의 수신 여부를 결정합니다"
            />
            <View style={styles.card}>
              <NotificationRow
                title="푸시 알림"
                titleBold
                value={notifications.pushEnabled}
                onToggle={() => toggleNotification('pushEnabled')}
              />
              <View style={styles.divider} />
              {NOTIFICATION_ITEMS.map((item, idx, arr) => {
                const value = item.isPromo
                  ? !!(
                      notifications.newPost &&
                      notifications.newLike &&
                      notifications.announcement
                    )
                  : notifications[item.key];
                const onToggle = item.isPromo
                  ? togglePromo
                  : () => toggleNotification(item.key);
                return (
                  <React.Fragment key={item.key}>
                    <NotificationRow
                      title={item.label}
                      subtitle={item.subtitle}
                      value={value}
                      onToggle={onToggle}
                      disabled={!notifications.pushEnabled}
                    />
                    {idx < arr.length - 1 && (
                      <View style={styles.innerDivider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* ────────────── 게시판 거리 설정 ────────────── */}
            <SectionHeader
              icon="social-distance"
              title="게시판 거리 설정"
              Icon={MaterialIcons}
              description="근처 게시글의 반경을 설정해요 (1 ~ 100km)"
            />
            <View style={styles.card}>
              {settingsHydrated && distanceKm != null ? (
                <>
              {/* 슬라이더 트랙 */}
              <View
                style={styles.sliderWrapper}
                onLayout={handleDistanceTrackLayout}
                {...distancePanResponder.panHandlers}
              >
                {/* 배경 트랙 */}
                <View style={styles.sliderTrack}>
                  {/* 채워진 부분 */}
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${thumbLeftPercent}%` },
                    ]}
                  />
                </View>
                {/* thumb — 퍼센트 위치에 absolute 배치 */}
                <View
                  style={[styles.sliderThumb, { left: `${thumbLeftPercent}%` }]}
                />
              </View>

              <View style={styles.distanceValueRow}>
                <Text style={styles.distanceValueText}>
                  {displayDistanceKm} km
                </Text>
                <View style={styles.distanceHintRow}>
                  <Text style={styles.distanceHint}>100km</Text>
                </View>
              </View>
                </>
              ) : (
                <View style={{ height: normalize(56), marginVertical: normalize(12) }} />
              )}
            </View>

            {/* ────────────── 기본 설정 ────────────── */}
            <SectionHeader
              icon="settings-outline"
              title="기본 설정"
              description="앱 화면 및 보안 설정"
            />
            <View style={styles.card}>
              <NotificationRow
                title="다크모드"
                titleBold
                value={darkModeEnabled}
                onToggle={showDarkModeComingSoon}
                disabled
                onDisabledPress={showDarkModeComingSoon}
              />
              <View style={styles.innerDivider} />
              <NotificationRow
                title="앱 잠금"
                titleBold
                subtitle="앱 실행 시 4자리 암호로 잠금"
                value={appLockEnabled}
                onToggle={() => handleAppLockToggle(!appLockEnabled)}
              />
              {appLockEnabled && (
                <>
                  <View style={styles.divider} />
                  <NotificationRow
                    title="생체 인증 사용"
                    value={biometricEnabled}
                    onToggle={handleBiometricToggle}
                    disabled={!biometricAvailability.available}
                  />
                  {!biometricAvailability.available && (
                    <Text
                      style={[
                        styles.notifSubtitle,
                        {
                          marginBottom: normalize(8),
                          marginTop: normalize(-4),
                        },
                      ]}
                    >
                      기기에서 생체 인증을 먼저 등록해 주세요
                    </Text>
                  )}
                  {APP_LOCK_ITEMS.map((item, idx, arr) => (
                    <React.Fragment key={item.key}>
                      <View style={styles.innerDivider} />
                      <AppLockItemRow
                        title={item.label}
                        subtitle={item.subtitle}
                        onPress={
                          item.key === 'changePin' ? handleChangePin : undefined
                        }
                      />
                      {idx < arr.length - 1 && (
                        <View style={styles.innerDivider} />
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {showProfile && (
          <>
            {/* ────────────── 아이디 변경 ────────────── */}
            <SectionHeader
              icon="at-outline"
              title="아이디 변경"
              description="아이디는 6개월에 1번만 변경할 수 있습니다."
            />
            <View style={styles.card}>
              <View style={styles.idFieldFirst}>
                <Text style={styles.pwLabel}>현재 아이디</Text>
                <View style={styles.pwInputWrap}>
                  <Text
                    style={[styles.pwInput, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {currentUsername}
                  </Text>
                </View>
              </View>
              <View style={styles.idFieldSecond}>
                <Text style={styles.pwLabel}>새 아이디</Text>
                <View style={styles.pwInputWrap}>
                  <Text
                    style={[
                      styles.pwInput,
                      styles.usernameAtPrefix,
                      {
                        color:
                          newUsername.trim().length > 0
                            ? colors.textPrimary
                            : colors.textLight20,
                      },
                    ]}
                  >
                    @
                  </Text>
                  <TextInput
                    style={styles.pwInput}
                    value={newUsername}
                    onChangeText={handleNewUsernameChange}
                    placeholder="아이디 입력"
                    {...themedTextInputProps}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              {nextChangeDate && !canChangeId && (
                <Text style={styles.idNextDate}>
                  다음 변경 가능일: {nextChangeDate.toLocaleDateString('ko-KR')}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (!canChangeId || newUsername.trim().length < 3) &&
                    styles.actionButtonDisabled,
                ]}
                onPress={handleIdChange}
                disabled={!canChangeId || newUsername.trim().length < 3}
              >
                <Text style={styles.actionButtonText}>아이디 변경하기</Text>
              </TouchableOpacity>
            </View>

            {/* ────────────── 학년·반 변경 ────────────── */}
            <SectionHeader
              icon="school-outline"
              title="학년·반 변경"
              description="학교는 변경할 수 없습니다. 학적 변동 시 학년·반만 수정해 주세요."
            />
            <View style={styles.card}>
              <View style={styles.idFieldFirst}>
                <Text style={styles.pwLabel}>재학 학교</Text>
                <View style={styles.pwInputWrap}>
                  <Text
                    style={[styles.pwInput, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {profileHydrated ? schoolName || '—' : '불러오는 중…'}
                  </Text>
                </View>
              </View>
              <View style={styles.idFieldSecond}>
                <Text style={styles.pwLabel}>학년</Text>
                <View style={styles.pwInputWrap}>
                  <TextInput
                    style={styles.pwInput}
                    value={gradeInput}
                    onChangeText={(v) =>
                      setGradeInput(String(v).replace(/\D/g, '').slice(0, 1))
                    }
                    placeholder="1~6"
                    keyboardType="number-pad"
                    {...themedTextInputProps}
                  />
                </View>
              </View>
              <View style={styles.pwFieldMiddle}>
                <Text style={styles.pwLabel}>반</Text>
                <View style={styles.pwInputWrap}>
                  <TextInput
                    style={styles.pwInput}
                    value={classInput}
                    onChangeText={(v) =>
                      setClassInput(String(v).replace(/\D/g, '').slice(0, 2))
                    }
                    placeholder="1~50"
                    keyboardType="number-pad"
                    {...themedTextInputProps}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  !canSubmitAcademicChange && styles.actionButtonDisabled,
                ]}
                onPress={handleAcademicChange}
                disabled={!canSubmitAcademicChange}
              >
                <Text style={styles.actionButtonText}>학년·반 변경하기</Text>
              </TouchableOpacity>
            </View>

            {/* ────────────── 비밀번호 변경 ────────────── */}
            <SectionHeader icon="lock-closed-outline" title="비밀번호 변경" />
            <View style={styles.card}>
              {renderPwInput({
                label: '현재 비밀번호',
                fieldKey: 'current',
                density: 'first',
              })}
              {renderPwInput({
                label: '새 비밀번호',
                fieldKey: 'next',
                density: 'middle',
              })}
              {renderPwInput({
                label: '새 비밀번호 확인',
                fieldKey: 'confirm',
                density: 'last',
              })}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  !canSubmitPasswordChange && styles.actionButtonDisabled,
                ]}
                onPress={handlePasswordChange}
                disabled={!canSubmitPasswordChange}
              >
                <Text style={styles.actionButtonText}>변경하기</Text>
              </TouchableOpacity>
              {!canSubmitPasswordChange && !!passwordGuideText && (
                <Text
                  style={[
                    styles.pwLabel,
                    { marginTop: 0, marginBottom: normalize(14) },
                  ]}
                >
                  {passwordGuideText}
                </Text>
              )}
            </View>
          </>
        )}

        <View style={styles.scrollBottomSpacer} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default Settings;
