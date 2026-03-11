import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const Settings = ({ navigation }) => {
  // ── 알림 설정 ──
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    newPost: true,
    newComment: true,
    newLike: false,
    announcement: true,
  });

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
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
  };

  const distancePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateDistanceFromPageX(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) => updateDistanceFromPageX(evt.nativeEvent.pageX),
    })
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
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

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
      { text: '확인', onPress: () => setPwForm({ current: '', next: '', confirm: '' }) },
    ]);
  };

  // ── 아이디 변경 (6개월에 1번) ──
  const [currentUsername, setCurrentUsername] = useState('@euncha015');
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
    if (!trimmed) { Alert.alert('입력 오류', '새 아이디를 입력해주세요.'); return; }
    if (!trimmed.startsWith('@')) { Alert.alert('입력 오류', '아이디는 @로 시작해야 합니다.'); return; }
    if (trimmed.length < 4) { Alert.alert('입력 오류', '아이디는 4자 이상이어야 합니다.'); return; }
    if (trimmed === currentUsername) { Alert.alert('입력 오류', '현재와 동일한 아이디입니다.'); return; }
    if (!canChangeId) {
      Alert.alert('변경 제한', `아이디는 6개월에 1번만 변경할 수 있습니다.\n다음 변경 가능일: ${nextChangeDate.toLocaleDateString('ko-KR')}`);
      return;
    }
    setCurrentUsername(trimmed);
    setNewUsername('');
    setLastIdChangeAt(new Date().toISOString());
    Alert.alert('완료', '아이디가 변경되었습니다.');
  };

  // ── 학교 변경 ──
  const handleSchoolChange = () => {
    Alert.alert('학교 변경 문의', '학교 변경을 원하시면 아래 메일로 문의해주세요.\n\nkimds8036@naver.com', [{ text: '확인' }]);
  };

  // ── 공통 컴포넌트 ──
  const SectionHeader = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color="#8FD397" />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const NotificationRow = ({ title, subtitle, value, onToggle, disabled }) => (
    <View style={[styles.notifRow, disabled && styles.notifRowDisabled]}>
      <View style={styles.notifLeft}>
        <Text style={[styles.notifTitle, disabled && styles.textDisabled]}>{title}</Text>
        {subtitle && <Text style={styles.notifSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#ddd', true: '#8FD397' }}
        thumbColor="#fff"
      />
    </View>
  );

  const PwInput = ({ label, fieldKey }) => (
    <View style={styles.pwField}>
      <Text style={styles.pwLabel}>{label}</Text>
      <View style={styles.pwInputWrap}>
        <TextInput
          style={styles.pwInput}
          value={pwForm[fieldKey]}
          onChangeText={(v) => setPwForm((prev) => ({ ...prev, [fieldKey]: v }))}
          secureTextEntry={!showPw[fieldKey]}
          placeholder="입력하세요"
          placeholderTextColor="#ccc"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPw((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}>
          <Ionicons name={showPw[fieldKey] ? 'eye-off-outline' : 'eye-outline'} size={20} color="#aaa" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // thumb 위치: 퍼센트를 픽셀로 환산 (트랙 너비를 알아야 정확하지만, translateX로 대응)
  const thumbLeftPercent = distancePercent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="설정" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ────────────── 알림 설정 ────────────── */}
        <SectionHeader icon="notifications-outline" title="알림 설정" />
        <View style={styles.card}>
          <NotificationRow
            title="푸시 알림"
            subtitle="모든 알림의 수신 여부를 결정합니다"
            value={notifications.pushEnabled}
            onToggle={() => toggleNotification('pushEnabled')}
          />
          <View style={styles.divider} />
          {[
            { key: 'newPost',      label: '새 게시글 알림' },
            { key: 'newComment',   label: '댓글 알림' },
            { key: 'newLike',      label: '좋아요 알림' },
            { key: 'announcement', label: '공지사항 알림' },
          ].map(({ key, label }, idx, arr) => (
            <React.Fragment key={key}>
              <NotificationRow
                title={label}
                value={notifications[key]}
                onToggle={() => toggleNotification(key)}
                disabled={!notifications.pushEnabled}
              />
              {idx < arr.length - 1 && <View style={styles.innerDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ────────────── 게시판 거리 설정 ────────────── */}
        <SectionHeader icon="location-outline" title="게시판 거리 설정" />
        <View style={styles.card}>
          <Text style={styles.distanceLabel}>
            게시글을 볼 수 있는 반경을 설정해요 (1km ~ 100km)
          </Text>

          {/* 슬라이더 트랙 */}
          <View
            style={styles.sliderWrapper}
            onLayout={handleDistanceTrackLayout}
            {...distancePanResponder.panHandlers}
          >
            {/* 배경 트랙 */}
            <View style={styles.sliderTrack}>
              {/* 채워진 부분 */}
              <View style={[styles.sliderFill, { width: `${thumbLeftPercent}%` }]} />
            </View>
            {/* thumb — 퍼센트 위치에 absolute 배치 */}
            <View style={[styles.sliderThumb, { left: `${thumbLeftPercent}%` }]} />
          </View>

          <View style={styles.distanceValueRow}>
            <Text style={styles.distanceValueText}>{distanceKm} km</Text>
            <View style={styles.distanceHintRow}>
              <Text style={styles.distanceHint}>100km</Text>
            </View>
          </View>
        </View>

        {/* ────────────── 아이디 변경 ────────────── */}
        <SectionHeader icon="at-outline" title="아이디 변경" />
        <View style={styles.card}>
          <View style={styles.idField}>
            <Text style={styles.pwLabel}>현재 아이디</Text>
            <Text style={styles.idCurrent}>{currentUsername}</Text>
          </View>
          <View style={styles.innerDivider} />
          <View style={styles.idField}>
            <Text style={styles.pwLabel}>새 아이디</Text>
            <View style={styles.pwInputWrap}>
              <TextInput
                style={styles.pwInput}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="@아이디 입력"
                placeholderTextColor="#ccc"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <Text style={styles.idHint}>아이디는 6개월에 1번만 변경할 수 있습니다.</Text>
          {nextChangeDate && !canChangeId && (
            <Text style={styles.idNextDate}>
              다음 변경 가능일: {nextChangeDate.toLocaleDateString('ko-KR')}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.actionButton, (!canChangeId || !newUsername.trim()) && styles.actionButtonDisabled]}
            onPress={handleIdChange}
            disabled={!canChangeId || !newUsername.trim()}
          >
            <Text style={styles.actionButtonText}>아이디 변경하기</Text>
          </TouchableOpacity>
        </View>

        {/* ────────────── 비밀번호 변경 ────────────── */}
        <SectionHeader icon="lock-closed-outline" title="비밀번호 변경" />
        <View style={styles.card}>
          <PwInput label="현재 비밀번호" fieldKey="current" />
          <View style={styles.innerDivider} />
          <PwInput label="새 비밀번호" fieldKey="next" />
          <View style={styles.innerDivider} />
          <PwInput label="새 비밀번호 확인" fieldKey="confirm" />
          <TouchableOpacity style={styles.actionButton} onPress={handlePasswordChange}>
            <Text style={styles.actionButtonText}>변경하기</Text>
          </TouchableOpacity>
        </View>

        {/* ────────────── 학교 변경 ────────────── */}
        <SectionHeader icon="school-outline" title="학교 변경" />
        <View style={styles.card}>
          <View style={styles.schoolRow}>
            <View style={styles.schoolInfo}>
              <Ionicons name="information-circle-outline" size={16} color="#8FD397" />
              <Text style={styles.schoolDesc}>
                학교 변경은 관리자 검토 후 처리됩니다.{'\n'}메일로 학교명과 학년/반을 함께 보내주세요.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.actionButton, styles.schoolButton]} onPress={handleSchoolChange}>
            <Ionicons name="mail-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>메일로 문의하기</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },

  // ── 섹션 헤더 ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8FD397',
    letterSpacing: 0.3,
  },

  // ── 카드 ──
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── 알림 ──
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  notifRowDisabled: { opacity: 0.4 },
  notifLeft: { flex: 1, marginRight: 12 },
  notifTitle: { fontSize: 15, color: '#333', fontWeight: '500' },
  notifSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  textDisabled: { color: '#aaa' },

  // ── 구분선 ──
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 4 },
  innerDivider: { height: 1, backgroundColor: '#f4f4f4' },

  // ── 슬라이더 (얇게 수정) ──
  distanceLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 16,
    marginBottom: 16,
  },
  sliderWrapper: {
    height: 20,               // 터치 영역 확보
    justifyContent: 'center',
    marginBottom: 8,
  },
  sliderTrack: {
    height: 4,                // ← 얇은 트랙
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#8FD397',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,                // ← 작은 thumb
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    marginLeft: -9,           // thumb 중앙 정렬
    top: 1,                   // (20 - 18) / 2
    borderWidth: 2,
    borderColor: '#8FD397',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  distanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  distanceValueText: { fontSize: 15, fontWeight: '700', color: '#8FD397' },
  distanceHintRow: { flexDirection: 'row', gap: 24 },
  distanceHint: { fontSize: 11, color: '#aaa' },

  // ── 비밀번호 ──
  pwField: { paddingVertical: 14 },
  pwLabel: { fontSize: 12, color: '#999', marginBottom: 6, fontWeight: '500' },
  pwInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pwInput: { flex: 1, fontSize: 14, color: '#333' },

  // ── 아이디 변경 ──
  idField: { paddingVertical: 14 },
  idCurrent: { fontSize: 14, color: '#333', fontWeight: '500' },
  idHint: { fontSize: 12, color: '#999', marginTop: 4, marginBottom: 4 },
  idNextDate: { fontSize: 12, color: '#8FD397', fontWeight: '600', marginBottom: 8 },
  actionButtonDisabled: { opacity: 0.5 },

  // ── 학교 ──
  schoolRow: { paddingVertical: 14 },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9f1',
    borderRadius: 10,
    padding: 12,
  },
  schoolDesc: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },
  schoolButton: { flexDirection: 'row' },

  // ── 공통 버튼 ──
  actionButton: {
    backgroundColor: '#8FD397',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 16,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default Settings;