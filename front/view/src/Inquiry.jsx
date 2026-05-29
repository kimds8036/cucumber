import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api } from '../../utils/api';

function isValidEmail(s) {
  const t = String(s || '').trim();
  if (t.length < 3 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function FieldLabel({ text, required, styles }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.sectionLabelText}>{text}</Text>
      {required ? <View style={styles.requiredDot} /> : null}
    </View>
  );
}

const Inquiry = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const initialContactUsername = String(
    route?.params?.contactUsername || '',
  ).trim();

  const [content, setContent] = useState('');
  const [contactUsername] = useState(initialContactUsername);
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({
    visible: false,
    message: '',
  });
  const [footerHeight, setFooterHeight] = useState(0);

  const appVersion =
    (Constants.expoConfig?.version || Constants.manifest?.version || '') + '';
  const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();

  const handleSubmit = async () => {
    if (submitting) return;
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (!contactUsername.trim()) {
      Alert.alert('알림', '아이디 정보가 없어 문의를 보낼 수 없습니다.');
      return;
    }
    if (!isValidEmail(contactEmail)) {
      Alert.alert('알림', '답변 수신용 이메일 주소를 올바르게 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('contact_username', contactUsername.trim());
      formData.append('contact_email', contactEmail.trim());
      if (appVersion) formData.append('app_version', appVersion);
      if (deviceInfo) formData.append('device_info', deviceInfo);

      await api.post('/api/inquiries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      setResultModal({
        visible: true,
        message:
          '문의가 접수되었습니다.\n답변은 입력하신 이메일로 안내드립니다.',
      });
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        '문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const closeResultAndExit = () => {
    setResultModal({ visible: false, message: '' });
    if (navigation.canGoBack()) navigation.goBack();
  };

  const styles = useMemo(() => createStyles(width, normalize), [width]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={normalize(24)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>문의하기</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={Math.max(footerHeight, normalize(16))}
      >
        <FieldLabel text="내용" required styles={styles} />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={content}
          onChangeText={setContent}
          placeholder="문의 내용을 자세히 입력해주세요"
          placeholderTextColor={colors.textLight40}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        <FieldLabel text="아이디" styles={styles} />
        <View style={styles.lockedFieldWrap}>
          <Text
            style={[
              styles.lockedFieldText,
              !contactUsername && styles.lockedFieldPlaceholder,
            ]}
            numberOfLines={1}
          >
            {contactUsername ? `@${contactUsername}` : '아이디 정보 없음'}
          </Text>
        </View>

        <FieldLabel text="답변 받을 이메일" required styles={styles} />
        <TextInput
          style={styles.input}
          value={contactEmail}
          onChangeText={setContactEmail}
          placeholder="example@email.com"
          placeholderTextColor={colors.textLight40}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={255}
        />

        <Text style={[styles.helperText, { marginTop: normalize(16) }]}>
          앱 버전: {appVersion || '-'} · {deviceInfo}
        </Text>
      </KeyboardAwareScrollView>

      <View
        style={styles.footerSection}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.9}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? '전송 중...' : '문의 보내기'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={resultModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>접수 완료</Text>
            <Text style={styles.resultBody}>{resultModal.message}</Text>
            <TouchableOpacity
              style={styles.resultBtn}
              onPress={closeResultAndExit}
            >
              <Text style={styles.resultBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (width, normalize) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: width * 0.04,
  },
  headerSection: {
    paddingTop: normalize(8),
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(36),
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: -normalize(4),
    padding: normalize(8),
  },
  headerTitle: {
    fontSize: normalize(fontSizes.heading),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: normalize(24),
    flexGrow: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: normalize(16),
    marginBottom: normalize(8),
    marginLeft: normalize(4),
  },
  sectionLabelText: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  requiredDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#D32F2F',
    marginLeft: normalize(6),
  },
  lockedFieldWrap: {
    width: '100%',
    minHeight: normalize(46),
    borderRadius: normalize(14),
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(10),
    backgroundColor: colors.surface,
    marginBottom: normalize(8),
    justifyContent: 'center',
  },
  lockedFieldText: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  lockedFieldPlaceholder: {
    color: colors.textLight40,
  },
  helperText: {
    fontSize: normalize(fontSizes.md),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: normalize(4),
    marginLeft: normalize(4),
    marginBottom: normalize(4),
  },
  input: {
    width: '100%',
    minHeight: normalize(46),
    borderWidth: 1,
    borderColor: colors.textLight20,
    borderRadius: normalize(14),
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(10),
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: normalize(8),
  },
  textarea: {
    minHeight: normalize(140),
    paddingTop: normalize(12),
  },
  footerSection: {
    paddingTop: normalize(8),
    paddingBottom: normalize(12),
    backgroundColor: colors.background,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: normalize(8),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: normalize(14),
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textLight20,
  },
  primaryButtonText: {
    fontSize: normalize(fontSizes.xxl),
    fontFamily: fonts.bold,
    color: '#fff',
  },
  resultBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: normalize(28),
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: normalize(14),
    padding: normalize(20),
  },
  resultTitle: {
    fontSize: normalize(fontSizes.xxl),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: normalize(10),
  },
  resultBody: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: normalize(22),
  },
  resultBtn: {
    marginTop: normalize(18),
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: normalize(10),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(20),
  },
  resultBtnText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: normalize(fontSizes.lg),
  },
});

export default Inquiry;
