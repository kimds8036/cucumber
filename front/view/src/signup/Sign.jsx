import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepConsent from './SignStepConsent';
import SignStepIdentity from './SignStepIdentity';
import SignStep2 from './SignStep2';
import SignStep4 from './SignStep4';
import SignStepVerificationMethod from './SignStepVerificationMethod';
import SignStepCertificate from './SignStepCertificate';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import { api } from '../../../utils/api';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import Skeleton from '../../../components/common/Skeleton';
import {
  showUnder14BlockAlert,
  showIneligibleAgeAlert,
} from './authFeatureAlerts';
import { getSignupEligibility } from './signupAgeUtils';
import {
  buildEnrollmentFromBirthDate,
  inferExpectedSchoolLevel,
  pickRandomProfileColorId,
} from './signupEnrollmentUtils';

/**
 * OCR·카메라 UI 테스트 전까지 앞단계(약관~인증방식)만 검증 생략.
 * OCR(학생증 촬영) 및 이후 단계는 실제 검증·API 유지.
 * 테스트 끝나면 false 로 변경.
 */
const SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST = false;

/** OCR API 호출용 임시 본인 정보 (SKIP 모드) */
const OCR_TEST_MOCK_IDENTITY = {
  name: '테스트학생',
  birthDate: '2010-05-15',
  phoneNumber: '01000000000',
};

/** Target Flow v2 — 가입 데이터는 State에만 쌓고, 마지막에 POST /api/auth/signup */
const STEP = {
  CONSENT: 0,
  IDENTITY: 1,
  VERIFY_METHOD: 2,
  STUDENT_VERIFY: 3,
  ACCOUNT: 4,
  PROFILE: 5,
};

const Sign = ({ navigation }) => {
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(STEP.CONSENT);
  const [formData, setFormData] = useState({});
  const [identityData, setIdentityData] = useState({});
  const [recognizedData, setRecognizedData] = useState(null);
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentVerificationToken, setStudentVerificationToken] =
    useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [stepInfoData, setStepInfoData] = useState({});
  const [step4Data, setStep4Data] = useState({});
  const [stepNumberData, setStepNumberData] = useState({});
  const [selectedVerificationMethod, setSelectedVerificationMethod] =
    useState('');
  const [consentData, setConsentData] = useState({
    allConsented: false,
    consents: {},
  });
  const [completeModalType, setCompleteModalType] = useState('signup');
  const [screenReady, setScreenReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  const isCertificateFlow = selectedVerificationMethod === 'certificate';
  const maxFlowStep = isCertificateFlow ? STEP.ACCOUNT : STEP.PROFILE;

  const progressWidth = (currentStep / maxFlowStep) * 100;
  const isCameraStep =
    currentStep === STEP.STUDENT_VERIFY && !isCertificateFlow;

  const identity = useMemo(
    () => ({
      name: identityData.name || formData.name || '',
      birthDate: identityData.birthDate || formData.birthDate || '',
      phoneNumber: identityData.phoneNumber || formData.phoneNumber || '',
    }),
    [identityData, formData],
  );

  const blockIfIneligibleBirthDate = useCallback(
    (birthDate) => {
      const eligibility = getSignupEligibility(birthDate);
      if (eligibility === 'invalid') {
        Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
        return true;
      }
      if (eligibility === 'under14') {
        showUnder14BlockAlert(() => resetTo('Login'));
        return true;
      }
      if (eligibility === 'ineligible') {
        showIneligibleAgeAlert(() => resetTo('Login'));
        return true;
      }
      return false;
    },
    [resetTo],
  );

  const prevVerificationMethodRef = useRef('');
  const ocrIdentityAnchorRef = useRef({ name: '', phone: '' });

  const handleBack = () => {
    if (currentStep === STEP.CONSENT) {
      navigation.goBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  /** 이름·전화 변경 시 OCR 토큰 무효화 (재과금·변조 방지) */
  useEffect(() => {
    const name = identityData.name?.trim() || '';
    const phone = identityData.phoneNumber || '';
    if (!studentVerificationToken) {
      ocrIdentityAnchorRef.current = { name, phone };
      return;
    }
    const anchor = ocrIdentityAnchorRef.current;
    if (
      anchor.name &&
      (anchor.name !== name || anchor.phone !== phone)
    ) {
      setStudentVerificationToken(null);
      setRecognizedData(null);
      setStudentVerified(false);
    }
    ocrIdentityAnchorRef.current = { name, phone };
  }, [
    identityData.name,
    identityData.phoneNumber,
    studentVerificationToken,
  ]);

  const handleConsentNext = () => {
    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST && !consentData.allConsented) return;
    setCurrentStep(STEP.IDENTITY);
  };

  const handleIdentityNext = () => {
    const birthDate =
      identityData.birthDate || OCR_TEST_MOCK_IDENTITY.birthDate;
    const name =
      identityData.name?.trim() || OCR_TEST_MOCK_IDENTITY.name;
    const phoneNumber =
      identityData.phoneNumber || OCR_TEST_MOCK_IDENTITY.phoneNumber;

    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (blockIfIneligibleBirthDate(birthDate)) return;
      if (!identityData.name?.trim()) {
        Alert.alert('알림', '이름을 입력해 주세요.');
        return;
      }
      if (!identityData.isVerified) {
        Alert.alert('알림', '전화번호 인증을 완료해 주세요.');
        return;
      }
    } else if (blockIfIneligibleBirthDate(birthDate)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      name,
      birthDate,
      phoneNumber,
    }));
    setIdentityData((prev) => ({
      ...prev,
      name,
      birthDate,
      phoneNumber,
      isVerified: true,
    }));
    setCurrentStep(STEP.VERIFY_METHOD);
  };

  const handleVerificationMethodNext = () => {
    const method =
      selectedVerificationMethod ||
      (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST ? 'studentId' : '');
    if (!method) {
      Alert.alert('알림', '학생 인증 방식을 선택해 주세요.');
      return;
    }
    if (!selectedVerificationMethod) {
      setSelectedVerificationMethod(method);
    }
    if (
      prevVerificationMethodRef.current &&
      prevVerificationMethodRef.current !== method
    ) {
      setRecognizedData(null);
      setStudentVerified(false);
      setStudentVerificationToken(null);
    }
    prevVerificationMethodRef.current = method;
    setCurrentStep(STEP.STUDENT_VERIFY);
  };

  const handleStudentVerified = (data) => {
    const school = data?.school || data?.verification?.school;
    const schoolName = school?.name || data?.school;
    const region = school?.region || '';
    const birthDate = identity.birthDate;
    const level =
      data?.verification?.expectedLevel ||
      inferExpectedSchoolLevel(birthDate);
    const enrollment = buildEnrollmentFromBirthDate(birthDate, level);
    const grade =
      data?.verification?.suggestedGrade ??
      data?.grade ??
      enrollment.grade ??
      1;
    const classNum = data?.verification?.suggestedClassNumber ?? data?.class ?? 1;
    const graduationYear =
      data?.verification?.suggestedGraduationYear ??
      data?.graduationYear ??
      enrollment.graduationYear;

    setRecognizedData(data);
    setStudentVerified(true);
    setStudentVerificationToken(
      data?.studentVerificationToken ||
        data?.verification?.studentVerificationToken ||
        null,
    );
    ocrIdentityAnchorRef.current = {
      name: identity.name?.trim() || '',
      phone: identity.phoneNumber || '',
    };
    setFormData((prev) => ({
      ...prev,
      schoolId: data.schoolId || school?.id,
      schoolName,
      schoolLevel: level,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear: String(graduationYear),
    }));

    Alert.alert(
      '학교 확인',
      `${schoolName}${region ? `\n${region}` : ''}\n\n이 학교가 맞나요?`,
      [
        {
          text: '다시 촬영',
          style: 'cancel',
          onPress: () => {
            setStudentVerified(false);
            setRecognizedData(null);
            setStudentVerificationToken(null);
          },
        },
        {
          text: '맞아요',
          onPress: () => setCurrentStep(STEP.ACCOUNT),
        },
      ],
    );
  };

  const handleAccountNext = () => {
    if (
      !stepInfoData.username ||
      !stepInfoData.password ||
      !stepInfoData.passwordConfirm
    ) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    if (stepInfoData.password !== stepInfoData.passwordConfirm) {
      Alert.alert('알림', '비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!studentVerified && selectedVerificationMethod === 'studentId') {
      Alert.alert('알림', '학생증 인증을 완료해 주세요.');
      return;
    }
    if (
      selectedVerificationMethod === 'studentId' &&
      !studentVerificationToken
    ) {
      Alert.alert('알림', '학생증 인증이 만료되었습니다. 다시 촬영해 주세요.');
      return;
    }
    setFormData((prev) => ({ ...prev, ...stepInfoData }));
    setCurrentStep(STEP.PROFILE);
  };

  const buildSignupPayload = (finalData, verificationMethod, certificateMeta = {}) => {
    const birthDate = finalData.birthDate || identity.birthDate;
    const level =
      finalData.schoolLevel || inferExpectedSchoolLevel(birthDate);
    const enrollment = buildEnrollmentFromBirthDate(birthDate, level);
    const grade = Number(finalData.grade) || enrollment.grade || 1;
    const classNumber = Number(finalData.classNum) || 1;
    const graduationYear =
      Number(finalData.graduationYear) || enrollment.graduationYear;

    const payload = {
      username: finalData.username,
      password: finalData.password,
      name: (finalData.name || identity.name || '').trim(),
      phone: String(
        finalData.phoneNumber || identity.phoneNumber || '',
      ).replace(/\D/g, ''),
      birthDate,
      schoolId: finalData.schoolId,
      grade,
      classNumber,
      graduationYear,
      colorId: pickRandomProfileColorId(),
      verificationMethod,
      consents: consentData.consents || {},
      ...certificateMeta,
    };
    if (verificationMethod === 'student_id' && studentVerificationToken) {
      payload.studentVerificationToken = studentVerificationToken;
    }
    return payload;
  };

  const handleCertificateSubmit = async () => {
    const merged = { ...formData, ...stepInfoData, ...stepNumberData };
    if (!consentData.allConsented) {
      Alert.alert('알림', '필수 약관에 동의해 주세요.');
      return;
    }
    if (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) {
      Alert.alert('알림', '증명서 열람 주소와 열람 번호를 입력해 주세요.');
      return;
    }
    if (
      !stepInfoData.username ||
      !stepInfoData.password ||
      stepInfoData.password !== stepInfoData.passwordConfirm
    ) {
      Alert.alert('알림', '아이디·비밀번호를 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(merged, 'certificate', {
        certificateViewUrl: stepNumberData.certificateUrl.trim(),
        certificateAccessCode: stepNumberData.submissionNumber.trim(),
        claimedSchoolName: stepNumberData.claimedSchoolName?.trim() || undefined,
      });
      await api.post('/api/auth/signup', payload);
      setCompleteModalType('certificate');
      setShowCompleteModal(true);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message ||
          '증명서 제출·가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    const finalData = { ...formData, ...step4Data, ...stepInfoData };

    if (!finalData.grade || !finalData.classNum) {
      Alert.alert('알림', '학년과 반을 입력해 주세요.');
      return;
    }
    if (!studentVerificationToken) {
      Alert.alert('알림', '학생증 인증이 만료되었습니다. 다시 촬영해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(finalData, 'student_id');
      await api.post('/api/auth/signup', payload);
      setCompleteModalType('signup');
      setShowCompleteModal(true);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    setShowCompleteModal(false);
    resetTo('Login');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '약관 동의';
      case STEP.IDENTITY:
        return '본인 확인';
      case STEP.VERIFY_METHOD:
        return '학생 인증 방식';
      case STEP.STUDENT_VERIFY:
        return isCertificateFlow ? '증명서 제출 안내' : '학생증 인증';
      case STEP.ACCOUNT:
        return '계정 정보';
      case STEP.PROFILE:
        return '학생 정보 확인';
      default:
        return '회원가입';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '서비스 이용을 위한 필수 동의 항목을 확인해 주세요.';
      case STEP.IDENTITY:
        return '이름·생년월일·전화번호를 입력하고 인증해 주세요.';
      case STEP.VERIFY_METHOD:
        return '학생증 OCR 인증 또는 증명서 제출 중 선택해 주세요.';
      case STEP.STUDENT_VERIFY:
        return isCertificateFlow
          ? '학생증이 없는 경우 증명서 제출 안내를 확인해 주세요.'
          : '학생증을 촬영하면 학교와 학교급을 자동으로 확인합니다.';
      case STEP.ACCOUNT:
        return '아이디와 비밀번호를 설정해 주세요.';
      case STEP.PROFILE:
        return '인증된 정보를 확인한 뒤 가입을 완료해 주세요.';
      default:
        return '';
    }
  };

  const handlePrimaryPress = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        handleConsentNext();
        break;
      case STEP.IDENTITY:
        handleIdentityNext();
        break;
      case STEP.VERIFY_METHOD:
        handleVerificationMethodNext();
        break;
      case STEP.STUDENT_VERIFY:
        if (isCertificateFlow) setCurrentStep(STEP.ACCOUNT);
        break;
      case STEP.ACCOUNT:
        if (isCertificateFlow) handleCertificateSubmit();
        else handleAccountNext();
        break;
      case STEP.PROFILE:
        handleComplete();
        break;
      default:
        break;
    }
  };

  const isPrimaryDisabled = () => {
    if (
      SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST &&
      currentStep <= STEP.VERIFY_METHOD
    ) {
      if (submitting) return true;
      return false;
    }
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.VERIFY_METHOD && !selectedVerificationMethod)
      return true;
    if (currentStep === STEP.IDENTITY) {
      if (!identityData.birthDate) return true;
      if (!identityData.isVerified) return true;
    }
    if (currentStep === STEP.ACCOUNT && isCertificateFlow) {
      if (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) {
        return true;
      }
      if (
        !stepInfoData.username ||
        !stepInfoData.password ||
        stepInfoData.password !== stepInfoData.passwordConfirm
      ) {
        return true;
      }
    }
    if (submitting) return true;
    return false;
  };

  const primaryLabel = () => {
    if (currentStep === STEP.PROFILE) return '회원가입';
    if (currentStep === STEP.ACCOUNT && isCertificateFlow) return '제출하기';
    return '다음 단계';
  };

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) return;
    setConsentData({ allConsented: true });
    setIdentityData((prev) => ({
      ...OCR_TEST_MOCK_IDENTITY,
      ...prev,
      isVerified: true,
      isCodeSent: true,
    }));
    setSelectedVerificationMethod((prev) => prev || 'studentId');
  }, []);

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          <Skeleton width={normalize(120)} height={normalize(18)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="chevron-back"
                size={normalize(24)}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${progressWidth}%` }]}
            />
          </View>
          <Text style={styles.description}>{getStepDescription()}</Text>
        </View>
      </View>

      <View style={styles.contentSection}>
        {currentStep === STEP.CONSENT && (
          <SignStepConsent
            normalize={normalize}
            selectedAgeGroup="over14"
            onChange={setConsentData}
          />
        )}
        {currentStep === STEP.IDENTITY && (
          <SignStepIdentity
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            initialData={identityData}
            onChange={setIdentityData}
          />
        )}
        {currentStep === STEP.VERIFY_METHOD && (
          <SignStepVerificationMethod
            styles={styles}
            selectedMethod={selectedVerificationMethod}
            onSelect={setSelectedVerificationMethod}
          />
        )}
        {currentStep === STEP.STUDENT_VERIFY &&
          (isCertificateFlow ? (
            <SignStepCertificate styles={styles} />
          ) : (
            <SignStepStudentIdVerify
              styles={styles}
              identity={identity}
              alreadyVerified={studentVerified}
              onVerified={handleStudentVerified}
            />
          ))}
        {currentStep === STEP.ACCOUNT &&
          (isCertificateFlow ? (
            <SignStep2
              styles={styles}
              normalize={normalize}
              bottomOffset={footerHeight}
              verifiedName={identity.name}
              verifiedBirthDate={identity.birthDate}
              verifiedPhone={identity.phoneNumber}
              showCertificateFields
              onChange={setStepInfoData}
              onCertificateChange={setStepNumberData}
            />
          ) : (
            <SignStep2
              styles={styles}
              normalize={normalize}
              bottomOffset={footerHeight}
              verifiedName={identity.name}
              verifiedBirthDate={identity.birthDate}
              verifiedPhone={identity.phoneNumber}
              onChange={setStepInfoData}
            />
          ))}
        {currentStep === STEP.PROFILE && !isCertificateFlow && (
          <SignStep4
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            recognizedData={recognizedData}
            schoolNameFallback={formData.schoolName}
            lockedName={identity.name}
            onChange={setStep4Data}
          />
        )}
      </View>

      {!isCameraStep && (
        <View
          style={styles.footerSection}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.bottomButtonContainer}>
            <View style={styles.nextButtonWrapper}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  isPrimaryDisabled() && {
                    backgroundColor: colors.textLight20,
                  },
                ]}
                activeOpacity={0.9}
                disabled={isPrimaryDisabled()}
                onPress={handlePrimaryPress}
              >
                <Text style={styles.nextButtonText}>
                  {submitting ? '처리 중…' : primaryLabel()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: colors.textSecondary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '85%',
              backgroundColor: colors.background,
              borderRadius: normalize(20),
              padding: normalize(25),
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: normalize(20),
                fontFamily: 'Baloo2-Bold',
                color: colors.textPrimary,
                marginBottom: normalize(10),
              }}
            >
              {completeModalType === 'certificate' ? '제출 성공' : '회원가입 성공'}
            </Text>
            <Text
              style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: normalize(16),
              }}
            >
              {completeModalType === 'certificate'
                ? '증명서 제출이 완료되었습니다.'
                : '회원가입이 완료되었습니다!'}
            </Text>
            <TouchableOpacity
              style={{
                width: '100%',
                height: normalize(45),
                backgroundColor: colors.primary,
                borderRadius: normalize(24),
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleGoToLogin}
            >
              <Text
                style={{
                  fontSize: normalize(16),
                  fontFamily: 'Baloo2-Bold',
                  color: colors.background,
                }}
              >
                확인
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Sign;
