import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { api } from '../../../utils/api';
import { normalizeBirthDateForCompare } from './signupBirthDatePolicy';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';

const UPLOAD_TIMEOUT_MS = 120_000;
const EXAMPLE_IMAGE = require('../../../assets/neis_plus_guide1.png');

/**
 * 나이스+ 학적 화면 제출 — signup_student_id 와 동일 API
 * @param {'signup'|'resubmit'} mode
 * @param {'default'|'stable'} layout stable = 학생증 재제출처럼 footer를 ScrollView 밖 고정
 */
const SignStepNeisPlusSubmit = ({
  styles: signupStyles,
  normalize = (n) => n,
  mode = 'signup',
  layout = 'default',
  identity,
  schoolId,
  onVerified,
  onSubmitted,
}) => {
  const [pickedUri, setPickedUri] = useState(null);
  const [pickedBase64, setPickedBase64] = useState(null);
  const [busy, setBusy] = useState(false);
  const stable = layout === 'stable' || mode === 'resubmit';

  const pickImage = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 첨부를 위해 앨범 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: false,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('첨부 실패', '이미지를 다시 선택해 주세요.');
      return;
    }
    setPickedUri(asset.uri);
    setPickedBase64(asset.base64);
  };

  const handleSubmit = async () => {
    if (busy) return;
    if (!pickedBase64) {
      Alert.alert('알림', '나이스+ 학적 화면 사진을 첨부해 주세요.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'resubmit') {
        const res = await api.post(
          '/api/auth/resubmit-student-id',
          { imageBase64: pickedBase64 },
          { timeout: UPLOAD_TIMEOUT_MS },
        );
        if (!res.data?.success) {
          throw new Error(res.data?.message || '제출에 실패했습니다.');
        }
        onSubmitted?.(res.data);
        return;
      }

      if (!identity?.name?.trim() || !identity?.birthDate || !schoolId) {
        Alert.alert('알림', '본인·학교 정보가 없습니다. 이전 단계를 확인해 주세요.');
        return;
      }

      const normalizedBirthDate =
        normalizeBirthDateForCompare(identity.birthDate) || identity.birthDate;
      const normalizedPhone = String(identity.phoneNumber || '').replace(/\D/g, '');

      const res = await api.post(
        '/api/auth/signup/upload-student-id',
        {
          name: identity.name.trim(),
          birthDate: normalizedBirthDate,
          phone: normalizedPhone,
          schoolId,
          imageBase64: pickedBase64,
        },
        { timeout: UPLOAD_TIMEOUT_MS },
      );

      const data = res.data?.data;
      if (!res.data?.success || !data?.passed) {
        Alert.alert(
          '제출 실패',
          res.data?.message || '나이스+ 사진을 다시 첨부해 주세요.',
        );
        return;
      }

      onVerified?.({
        name: identity.name,
        manualReview: true,
        cloudinaryUrl: data.cloudinaryUrl,
        grade: data.suggestedGrade ?? '',
        class: data.suggestedClassNumber ?? '',
        graduationYear: data.suggestedGraduationYear ?? '',
        expectedLevel: data.expectedLevel,
        studentVerificationToken: data.studentVerificationToken,
        verification: data,
      });
    } catch (e) {
      const timedOut = e?.code === 'ECONNABORTED';
      const networkLike =
        timedOut || !e?.response || e?.message === 'Network Error';
      Alert.alert(
        '제출 오류',
        e?.response?.status === 429
          ? e?.response?.data?.message ||
            '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
          : networkLike
            ? '업로드에 시간이 걸리거나 연결이 끊겼습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.'
            : e?.response?.data?.message ||
              e?.message ||
              '나이스+ 제출 중 오류가 발생했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };

  const guideStyles = signupStyles || localGuideFallback;
  const exampleImageStyle =
    guideStyles.certificateGuideStepImage || {
      width: normalize(240),
      height: normalize(240) * 1.85,
    };
  const scrollContentPad =
    guideStyles.certificateGuideScrollContent || {
      paddingHorizontal: normalize(10),
      paddingBottom: normalize(24),
    };

  const steps = (
    <>
      <View style={guideStyles.certificateGuideStepBlock || localStyles.stepBlock}>
        <View style={guideStyles.certificateGuideStepHeader || localStyles.stepHeader}>
          <Text style={guideStyles.certificateGuideStepNumber || localStyles.stepNumber}>
            01
          </Text>
          <Text style={guideStyles.certificateGuideStepTitle || localStyles.stepTitle}>
            나이스+ 학적 화면 예시
          </Text>
        </View>
        <Text
          style={
            guideStyles.certificateGuideStepDescription || localStyles.stepDesc
          }
        >
          나이스+ 앱에서{' '}
          <Text
            style={
              guideStyles.certificateGuideStepDescriptionBold ||
              localStyles.stepDescBold
            }
          >
            이름과 학교
          </Text>
          가 선명하게 보이도록 학적 화면을 캡처해 주세요.
        </Text>
        <Image
          source={EXAMPLE_IMAGE}
          style={exampleImageStyle}
          resizeMode="contain"
        />
      </View>

      <View
        style={[
          guideStyles.certificateGuideStepBlock || localStyles.stepBlock,
          { marginTop: normalize(8) },
        ]}
      >
        <View style={guideStyles.certificateGuideStepHeader || localStyles.stepHeader}>
          <Text style={guideStyles.certificateGuideStepNumber || localStyles.stepNumber}>
            02
          </Text>
          <Text style={guideStyles.certificateGuideStepTitle || localStyles.stepTitle}>
            사진 첨부
          </Text>
        </View>
        <Text
          style={
            guideStyles.certificateGuideStepDescription || localStyles.stepDesc
          }
        >
          예시처럼 이름·학교가 잘 보이는 캡처본을 첨부한 뒤 제출해 주세요.
        </Text>

        {pickedUri ? (
          <View
            style={[
              localStyles.previewWrap,
              {
                width: normalize(220),
                height: normalize(220) * 1.4,
              },
            ]}
          >
            <Image
              source={{ uri: pickedUri }}
              style={[
                localStyles.preview,
                {
                  width: '100%',
                  height: '100%',
                  borderRadius: normalize(12),
                },
              ]}
              resizeMode="cover"
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[
              localStyles.attachBox,
              {
                borderRadius: normalize(12),
                paddingVertical: normalize(28),
                width: '100%',
              },
            ]}
            activeOpacity={0.85}
            onPress={pickImage}
            disabled={busy}
          >
            <Ionicons
              name="image-outline"
              size={normalize(32)}
              color={colors.primaryDark}
            />
            <Text style={[localStyles.attachText, { fontSize: normalize(15) }]}>
              앨범에서 사진 선택
            </Text>
          </TouchableOpacity>
        )}

        {pickedUri ? (
          <TouchableOpacity
            style={{ marginTop: normalize(10) }}
            onPress={pickImage}
            disabled={busy}
          >
            <Text style={[localStyles.changeText, { fontSize: normalize(14) }]}>
              다른 사진으로 바꾸기
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  const submitButton = (
    <TouchableOpacity
      style={[
        guideStyles.nextButton || localStyles.submitFallback,
        (!pickedBase64 || busy) &&
          (guideStyles.nextButtonDisabled || { opacity: 0.5 }),
      ]}
      activeOpacity={0.9}
      disabled={!pickedBase64 || busy}
      onPress={handleSubmit}
    >
      {busy ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={guideStyles.nextButtonText || localStyles.submitTextFallback}>
          제출하기
        </Text>
      )}
    </TouchableOpacity>
  );

  if (stable) {
    return (
      <View style={localStyles.root}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            scrollContentPad,
            { paddingBottom: normalize(16) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          scrollEnabled={!busy}
        >
          {steps}
        </ScrollView>
        <View
          style={[
            localStyles.footer,
            {
              paddingHorizontal:
                scrollContentPad.paddingHorizontal ?? normalize(10),
            },
          ]}
        >
          {submitButton}
        </View>
        <SubmittingLockModal visible={busy} message="나이스+ 제출 중…" />
      </View>
    );
  }

  return (
    <View
      style={[
        guideStyles.ageGateContainer || localStyles.root,
        guideStyles.certificateGuideContainer,
      ]}
    >
      <ScrollView
        style={guideStyles.certificateGuideScroll || { flex: 1 }}
        contentContainerStyle={[
          guideStyles.certificateGuideScrollContent,
          { paddingBottom: normalize(28) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical
        scrollEnabled={!busy}
      >
        {steps}
        <View style={guideStyles.certificateGuideButtonSection}>
          {submitButton}
        </View>
      </ScrollView>
      <SubmittingLockModal visible={busy} message="나이스+ 제출 중…" />
    </View>
  );
};

const localStyles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  footer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 12,
    flexShrink: 0,
  },
  stepBlock: {
    marginBottom: 10,
    alignItems: 'center',
  },
  stepHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  stepNumber: {
    fontSize: 28,
    fontFamily: fonts.regular,
    color: colors.background2,
    lineHeight: 40,
  },
  stepTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  stepDesc: {
    width: '100%',
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  stepDescBold: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  previewWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  preview: {
    backgroundColor: colors.surface,
  },
  attachBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryDark,
    backgroundColor: colors.lightgreen,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachText: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  changeText: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  submitFallback: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTextFallback: {
    fontFamily: fonts.bold,
    color: colors.background,
    fontSize: fontSizes?.lg || 16,
  },
});

/** signupStyles 없이 단독(거절 재제출)로 쓸 때 가이드 톤 맞춤 */
const localGuideFallback = StyleSheet.create({
  ageGateContainer: { flex: 1, minHeight: 0 },
  certificateGuideContainer: { overflow: 'hidden' },
  certificateGuideScroll: { flex: 1 },
  certificateGuideScrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  certificateGuideStepBlock: {
    marginBottom: 10,
    alignItems: 'center',
  },
  certificateGuideStepHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  certificateGuideStepNumber: {
    fontSize: 28,
    fontFamily: fonts.regular,
    color: colors.background2,
    lineHeight: 40,
  },
  certificateGuideStepTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  certificateGuideStepDescription: {
    width: '100%',
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  certificateGuideStepDescriptionBold: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  certificateGuideStepImage: {
    width: '68%',
    aspectRatio: 1 / 1.85,
  },
  certificateGuideButtonSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    gap: 12,
  },
  nextButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: { opacity: 0.45 },
  nextButtonText: {
    fontFamily: fonts.bold,
    color: colors.background,
    fontSize: 16,
  },
});

export default SignStepNeisPlusSubmit;
