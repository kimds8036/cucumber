import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import SubHeader from '../frame/subHeader';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api } from '../../utils/api';
import MyInquiries from './MyInquiries';
import InquiryDetail from './InquiryDetail';

const MAX_IMAGES = 3;

function isValidEmail(s) {
  const t = String(s || '').trim();
  if (t.length < 3 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function FieldLabel({ text, styles }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

function InquiryReplyHint({ style, boldStyle }) {
  if (boldStyle) {
    return (
      <Text style={style}>
        답변은{' '}
        <Text style={boldStyle}>[고객지원 {'>'} 문의사항]</Text>
        에서 확인할 수 있어요.
      </Text>
    );
  }
  return (
    <Text style={style}>
      답변은 [고객지원 {'>'} 문의사항]에서 확인해 주세요.
    </Text>
  );
}

const InAppInquiry = ({ navigation, fullScreenOverlay = false }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [content, setContent] = useState('');
  const [contactUsername, setContactUsername] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({
    visible: false,
    message: '',
    variant: '',
  });
  // footer onLayout 전후 padding 점프 방지 — 학생증 재제출과 같은 풀스크린일 땐 하단 inset을 SafeAreaView가 담당
  const estimatedFooter =
    normalize(12) + normalize(50) + normalize(12) + (fullScreenOverlay ? 0 : insets.bottom);
  const [footerHeight, setFooterHeight] = useState(estimatedFooter);
  /** fullScreenOverlay 전용: compose | list | detail */
  const [overlayView, setOverlayView] = useState('compose');
  const [overlayDetailId, setOverlayDetailId] = useState(null);

  const bottomOffset = Math.max(footerHeight, estimatedFooter);

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
      Alert.alert(
        '알림',
        `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`,
      );
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
      Alert.alert(
        '알림',
        '아이디 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
      return;
    }
    // if (!isValidEmail(contactEmail)) {
    //   Alert.alert('알림', '답변 수신용 이메일 주소를 올바르게 입력해주세요.');
    //   return;
    // }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('contact_username', contactUsername.trim());
      // formData.append('contact_email', contactEmail.trim());
      formData.append(
        'contact_email',
        contactEmail.trim() || `${contactUsername.trim()}@in-app.youthpaper`,
      );
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
        message: '',
        variant: 'success',
      });
    } catch (error) {
      const resp = error?.response;
      const data = resp?.data;
      if (resp?.status === 409 && data?.code === 'INQUIRY_DUPLICATE') {
        setResultModal({
          visible: true,
          message:
            data?.message ||
            '방금 접수한 문의가 있습니다.\n잠시 후 다시 시도하거나 기존 문의를 확인해주세요.',
          variant: 'duplicate',
        });
        return;
      }
      const msg =
        data?.message ||
        '문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const closeResultAndExit = () => {
    setResultModal({ visible: false, message: '', variant: '' });
    if (typeof navigation?.goBack === 'function') {
      navigation.goBack();
    }
  };

  const styles = useMemo(() => createStyles(width, normalize), [width]);
  // 거절 플로우(fullScreenOverlay): SafeArea 는 App 셸만 담당 → 여기선 View
  const Root = fullScreenOverlay ? View : SafeAreaView;

  const formFields = (
    <>
      <FieldLabel text="내용" styles={styles} />
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

      {/* <FieldLabel text="연락용 이메일" styles={styles} />
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
      <Text style={styles.emailHint}>
        답변은 앱 알림과 「내 문의」에서 확인하실 수 있습니다.
      </Text> */}

      

      <View style={styles.imageHeaderRow}>
        <Text style={styles.sectionLabelText}>이미지 첨부</Text>
        <Text style={styles.imageCountText}>
          {images.length}/{MAX_IMAGES}
        </Text>
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
          <TouchableOpacity
            style={styles.imageAddBtn}
            onPress={handlePickImages}
          >
            <Ionicons
              name="camera-outline"
              size={normalize(24)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  const openMyInquiries = () => {
    if (fullScreenOverlay) {
      setOverlayView('list');
      return;
    }
    navigation?.navigate?.('MyInquiries');
  };

  if (fullScreenOverlay && overlayView === 'list') {
    return (
      <MyInquiries
        fullScreenOverlay
        navigation={{
          goBack: () => setOverlayView('compose'),
        }}
        onOpenCompose={() => setOverlayView('compose')}
        onOpenDetail={(id) => {
          setOverlayDetailId(id);
          setOverlayView('detail');
        }}
      />
    );
  }

  if (fullScreenOverlay && overlayView === 'detail') {
    return (
      <InquiryDetail
        fullScreenOverlay
        inquiryId={overlayDetailId}
        navigation={{
          goBack: () => setOverlayView('list'),
        }}
      />
    );
  }

  return (
    <Root
      style={styles.container}
      {...(fullScreenOverlay
        ? {}
        : { edges: ['top'] })}
    >
      <SubHeader
        title="문의하기"
        onBack={() => navigation.goBack()}
        rightElement={
          <FontAwesome5
            name="list-ul"
            size={normalize(18)}
            color={colors.textPrimary}
          />
        }
        onRightPress={openMyInquiries}
      />

      <View style={styles.body}>
        {fullScreenOverlay ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: normalize(16) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
            bounces={false}
            overScrollMode="never"
          >
            {formFields}
          </ScrollView>
        ) : (
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomOffset },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
            bottomOffset={bottomOffset}
          >
            {formFields}
          </KeyboardAwareScrollView>
        )}
        <InquiryReplyHint
          style={styles.emailHint}
          boldStyle={styles.emailHintBold}
        />

        <View
          style={[
            styles.footerSection,
            {
              paddingBottom: fullScreenOverlay
                ? normalize(12)
                : Math.max(normalize(12), insets.bottom),
            },
          ]}
          onLayout={(e) => {
            if (!fullScreenOverlay) {
              setFooterHeight(e.nativeEvent.layout.height);
            }
          }}
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
      </View>

      <Modal
        visible={resultModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {resultModal.variant === 'duplicate' ? '접수 실패' : '접수 완료'}
            </Text>
            {resultModal.variant === 'success' ? (
              <Text style={styles.resultBody}>
                문의가 접수되었습니다.{'\n'}
                <InquiryReplyHint />
              </Text>
            ) : (
              <Text style={styles.resultBody}>{resultModal.message}</Text>
            )}
            <TouchableOpacity
              style={styles.resultBtn}
              onPress={closeResultAndExit}
            >
              <Text style={styles.resultBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Root>
  );
};

const createStyles = (width, normalize) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emailHint: {
    marginTop: normalize(6),
    marginLeft: normalize(4),
    fontSize: normalize(fontSizes.md+1),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: normalize(18),
    textAlign: 'center',
  },
  emailHintBold: {
    fontFamily: fonts.bold,
  },
  body: {
    flex: 1,
    paddingHorizontal: width * 0.07,
  },
  scrollContent: {
    paddingBottom: normalize(24),
    flexGrow: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(8),
    marginLeft: normalize(4),
  },
  sectionLabelText: {
    fontSize: normalize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
  resultBtn: {
    marginTop: normalize(18),
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: normalize(10),
    paddingVertical: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: normalize(fontSizes.xl),
  },
});

export default InAppInquiry;
