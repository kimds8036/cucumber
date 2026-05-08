import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api } from '../../utils/api';

const MAX_IMAGES = 3;

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

const InAppInquiry = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [content, setContent] = useState('');
  const [contactUsername, setContactUsername] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ visible: false, message: '' });
  const [footerHeight, setFooterHeight] = useState(0);

  const appVersion =
    (Constants.expoConfig?.version || Constants.manifest?.version || '') + '';
  const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();

  // 로그인 사용자 본인의 username 자동 prefill (수정 불가 — 본인 식별용)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const meRes = await api.get('/api/auth/me');
        const me = meRes?.data?.data;
        if (mounted && me?.username) {
          setContactUsername(String(me.username));
        }
      } catch (e) {
        // ignore — 자동 입력 실패 시 사용자에게 안내
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('알림', `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES - images.length,
      });
      if (!result.canceled) {
        const uris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
      }
    } catch (e) {
      Alert.alert('오류', '이미지를 불러오지 못했습니다.');
    }
  };

  const handleRemoveImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (!contactUsername.trim()) {
      Alert.alert('알림', '아이디 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
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
      images.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `inquiry_${index}.jpg`,
        });
      });

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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={normalize(24)} color={colors.textPrimary} />
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
            {contactUsername ? `@${contactUsername}` : '아이디 불러오는 중...'}
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

        <View style={styles.imageHeaderRow}>
          <Text style={styles.sectionLabelText}>이미지 첨부</Text>
          <Text style={styles.imageCountText}>{images.length}/{MAX_IMAGES}</Text>
        </View>
        <View style={styles.imageRow}>
          {images.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.imageThumbWrap}>
              <Image source={{ uri }} style={styles.imageThumb} />
              <TouchableOpacity
                style={styles.imageRemoveBtn}
                onPress={() => handleRemoveImage(idx)}
              >
                <Ionicons name="close" size={normalize(14)} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_IMAGES ? (
            <TouchableOpacity style={styles.imageAddBtn} onPress={handlePickImages}>
              <Ionicons name="camera-outline" size={normalize(24)} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.helperText, { marginTop: normalize(16) }]}>
          앱 버전: {appVersion || '-'} · {deviceInfo}
        </Text>
      </KeyboardAwareScrollView>

      <View
        style={styles.footerSection}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
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
        onRequestClose={closeResultAndExit}
      >
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>접수 완료</Text>
            <Text style={styles.resultBody}>{resultModal.message}</Text>
            <TouchableOpacity style={styles.resultBtn} onPress={closeResultAndExit}>
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
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: normalize(16),
    marginBottom: normalize(8),
    paddingHorizontal: normalize(4),
  },
  imageCountText: {
    fontSize: normalize(fontSizes.lg),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
  },
  imageThumbWrap: {
    width: normalize(70),
    height: normalize(70),
    borderRadius: normalize(10),
    overflow: 'hidden',
    marginRight: normalize(8),
    marginBottom: normalize(8),
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: normalize(2),
    right: normalize(2),
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddBtn: {
    width: normalize(70),
    height: normalize(70),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: colors.textLight20,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  footerSection: {
    paddingTop: normalize(8),
    paddingBottom: normalize(12),
    backgroundColor: colors.background,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: normalize(20),
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

export default InAppInquiry;
