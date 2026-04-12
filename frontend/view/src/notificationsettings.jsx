import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SubHeader from '../frame/subHeader';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import {
  getNormalize,
  createNotificationSettingsStyles,
  themedTextInputProps,
} from '../../styles/mypage.style';

const SCHOOL_CHANGE_EMAIL = 'kimds8036@naver.com';

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
  const headerTitle = variant === 'profile' ? '변경' : '설정';
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

  const [loadingSettings, setLoadingSettings] = useState(false);

  const syncSettingsToServer = async (next) => {
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
        const results = await Promise.allSettled([
          api.get('/api/settings'),
          api.get('/api/auth/me'),
        ]);

        if (!mounted) return;

        if (results[1].status === 'fulfilled') {
          const me = results[1].value.data?.data;
          if (me) {
            setCurrentUsername(me.username ? `@${me.username}` : '');
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
            setDistanceKm(data.boardDistanceKm ?? 10);
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
        if (mounted) setLoadingSettings(false);
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
        distanceKm,
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
        distanceKm,
        lastIdChangeAt,
      });
      return next;
    });
  };

  // ── 게시판 거리 설정 (1~100km) ──
  const [distanceKm, setDistanceKm] = useState(10);
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);

  const distancePercent = ((distanceKm - 1) / 99) * 100; // 1→0%, 100→100%

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

  const handlePasswordChange = () => {
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
    Alert.alert('완료', '비밀번호가 변경되었습니다.', [
      {
        text: '확인',
        onPress: () => setPwForm({ current: '', next: '', confirm: '' }),
      },
    ]);
  };

  // ── 아이디 변경 (6개월에 1번) ──
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [lastIdChangeAt, setLastIdChangeAt] = useState(null);

  const getNextChangeDate = () => {
    if (!lastIdChangeAt) return null;
    const d = new Date(lastIdChangeAt);
    d.setMonth(d.getMonth() + 6);
    return d;
  };
  const nextChangeDate = getNextChangeDate();
  const canChangeId = nextChangeDate === null || new Date() >= nextChangeDate;

  const handleIdChange = () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', '새 아이디를 입력해주세요.');
      return;
    }
    if (!trimmed.startsWith('@')) {
      Alert.alert('입력 오류', '아이디는 @로 시작해야 합니다.');
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
    const nowIso = new Date().toISOString();
    setCurrentUsername(trimmed);
    setNewUsername('');
    setLastIdChangeAt(nowIso);
    syncSettingsToServer({
      ...notifications,
      distanceKm,
      lastIdChangeAt: nowIso,
    });
    Alert.alert('완료', '아이디가 변경되었습니다.');
  };

  // ── 학교 변경 ──
  const handleSchoolChange = () => {
    Alert.alert(
      '학교 변경 문의',
      `학교 변경을 원하시면 아래 메일로 증명서를 보내주세요.\n\n${SCHOOL_CHANGE_EMAIL}`,
      [
        {
          text: '메일 주소 복사',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(SCHOOL_CHANGE_EMAIL);
              Alert.alert('알림', '메일 주소를 클립보드에 복사했습니다.');
            } catch (e) {
              console.warn('클립보드 복사 실패:', e);
              Alert.alert('오류', '복사에 실패했습니다. 메일 주소를 직접 입력해 주세요.');
            }
          },
        },
        { text: '확인', style: 'cancel' },
      ],
    );
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
          <Text
            style={[styles.notifSubtitle, disabled && styles.textDisabled]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.notifSwitchWrap}>
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textWhite}
        />
      </View>
    </View>
  );

  const PwInput = ({ label, fieldKey, density }) => (
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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
                {idx < arr.length - 1 && <View style={styles.innerDivider} />}
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
                style={[styles.sliderFill, { width: `${thumbLeftPercent}%` }]}
              />
            </View>
            {/* thumb — 퍼센트 위치에 absolute 배치 */}
            <View
              style={[styles.sliderThumb, { left: `${thumbLeftPercent}%` }]}
            />
          </View>

          <View style={styles.distanceValueRow}>
            <Text style={styles.distanceValueText}>{distanceKm} km</Text>
            <View style={styles.distanceHintRow}>
              <Text style={styles.distanceHint}>100km</Text>
            </View>
          </View>
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
              <Text style={styles.pwInput} numberOfLines={1}>
                {currentUsername}
              </Text>
            </View>
          </View>
          <View style={styles.idFieldSecond}>
            <Text style={styles.pwLabel}>새 아이디</Text>
            <View style={styles.pwInputWrap}>
              <TextInput
                style={styles.pwInput}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="@아이디 입력"
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
              (!canChangeId || !newUsername.trim()) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleIdChange}
            disabled={!canChangeId || !newUsername.trim()}
          >
            <Text style={styles.actionButtonText}>아이디 변경하기</Text>
          </TouchableOpacity>
        </View>

        {/* ────────────── 비밀번호 변경 ────────────── */}
        <SectionHeader icon="lock-closed-outline" title="비밀번호 변경" />
        <View style={styles.card}>
          <PwInput label="현재 비밀번호" fieldKey="current" density="first" />
          <PwInput label="새 비밀번호" fieldKey="next" density="middle" />
          <PwInput label="새 비밀번호 확인" fieldKey="confirm" density="last" />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePasswordChange}
          >
            <Text style={styles.actionButtonText}>변경하기</Text>
          </TouchableOpacity>
        </View>

        {/* ────────────── 학교 변경 ────────────── */}
        <SectionHeader icon="school-outline" title="학교 변경" />
        <View style={styles.card}>
          <View style={styles.schoolRow}>
            <View style={styles.schoolInfo}>
              <Ionicons
                name="information-circle-outline"
                size={normalize(16)}
                color={colors.primary}
              />
              <Text style={styles.schoolDesc}>
                학교 변경은 관리자 검토 후 처리됩니다.{'\n'}초중고 졸업(예정) 증명서를 메일로 보내주세요.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.schoolButton]}
            onPress={handleSchoolChange}
          >
            <Ionicons
              name="mail-outline"
              size={normalize(16)}
              color={colors.textWhite}
              style={styles.schoolButtonIcon}
            />
            <Text style={styles.actionButtonText}>메일로 문의하기</Text>
          </TouchableOpacity>
        </View>
          </>
        )}

        <View style={styles.scrollBottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
