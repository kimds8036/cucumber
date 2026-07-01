import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepConsent from './SignStepConsent';
import SignStepIdentity from './SignStepIdentity';
import SignStep2 from './SignStep2';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import SignStepVerificationMethod from './SignStepVerificationMethod';
import SignStepCertificateGuide from './SignStepCertificateGuide';
import SignStepCertificate from './SignStepCertificate';
import { api, setAuthToken } from '../../../utils/api';
import {
  isValidUsername,
  isValidPassword,
  USERNAME_ERROR,
  PASSWORD_ERROR,
} from '../../../utils/signupValidation';
import { useAuth } from '../../../context/AuthContext';
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

/** 가입: 약관 → 본인확인 → 계정 → 인증방식 선택 → 학생증 | 재학증명서 가이드 → 증명서 제출 */
const STEP = {
  CONSENT: 0,
  IDENTITY: 1,
  ACCOUNT: 2,
  VERIFICATION_METHOD: 3,
  STUDENT_VERIFY: 4,
  CERTIFICATE_GUIDE: 5,
  CERTIFICATE_SUBMIT: 6,
};

const SIGNUP_PROGRESS_LAST = STEP.CERTIFICATE_SUBMIT;

const Sign = ({ navigation }) => {
  const { login } = useAuth();
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
  const [stepInfoData, setStepInfoData] = useState({});
  const [certificateData, setCertificateData] = useState({
    certificateUrl: '',
    accessNumber: '',
  });
  const [consentData, setConsentData] = useState({
    allConsented: false,
    consents: {},
  });
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [screenReady, setScreenReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  const progressWidth =
    currentStep <= STEP.CONSENT
      ? 0
      : ((currentStep - STEP.IDENTITY + 1) /
          (SIGNUP_PROGRESS_LAST - STEP.IDENTITY + 1)) *
        100;
  const isCameraStep =
    currentStep === STEP.STUDENT_VERIFY && !studentVerified;
  const hideFooter =
    isCameraStep ||
    currentStep === STEP.VERIFICATION_METHOD ||
    currentStep === STEP.CERTIFICATE_GUIDE;

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

  const ocrIdentityAnchorRef = useRef({ name: '', phone: '' });

  const handleBack = () => {
    if (currentStep === STEP.CONSENT) {
      navigation.goBack();
      return;
    }
    if (
      currentStep === STEP.STUDENT_VERIFY ||
      currentStep === STEP.CERTIFICATE_GUIDE ||
      currentStep === STEP.CERTIFICATE_SUBMIT
    ) {
      if (currentStep === STEP.STUDENT_VERIFY) {
        setStudentVerified(false);
        setStudentVerificationToken(null);
        setRecognizedData(null);
      }
      if (currentStep === STEP.CERTIFICATE_SUBMIT) {
        setCurrentStep(STEP.CERTIFICATE_GUIDE);
        return;
      }
      setCurrentStep(STEP.VERIFICATION_METHOD);
      return;
    }
    setCurrentStep((s) => s - 1);
  };

  /** 이름·전화·학교 변경 시 OCR 토큰 무효화 (재과금·변조 방지) */
  useEffect(() => {
    const name = identityData.name?.trim() || '';
    const phone = identityData.phoneNumber || '';
    const schoolId = selectedSchool?.id || '';
    if (!studentVerificationToken) {
      ocrIdentityAnchorRef.current = { name, phone, schoolId };
      return;
    }
    const anchor = ocrIdentityAnchorRef.current;
    if (
      anchor.name &&
      (anchor.name !== name ||
        anchor.phone !== phone ||
        (anchor.schoolId && anchor.schoolId !== schoolId))
    ) {
      setStudentVerificationToken(null);
      setRecognizedData(null);
      setStudentVerified(false);
    }
    ocrIdentityAnchorRef.current = { name, phone, schoolId };
  }, [
    identityData.name,
    identityData.phoneNumber,
    selectedSchool?.id,
    studentVerificationToken,
  ]);

  const handleConsentNext = () => {
    // [임시-수정용] 검증 주석처리 (수정 끝나면 아래 줄 주석 해제)
    // if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST && !consentData.allConsented) return;
    setCurrentStep(STEP.IDENTITY);
  };

  const handleIdentityNext = () => {
    const birthDate =
      identityData.birthDate || OCR_TEST_MOCK_IDENTITY.birthDate;
    const name =
      identityData.name?.trim() || OCR_TEST_MOCK_IDENTITY.name;
    const phoneNumber =
      identityData.phoneNumber || OCR_TEST_MOCK_IDENTITY.phoneNumber;

    // [임시-수정용] 검증 주석처리 (수정 끝나면 아래 블록 주석 해제)
    // if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
    //   if (blockIfIneligibleBirthDate(birthDate)) return;
    //   if (!identityData.name?.trim()) {
    //     Alert.alert('알림', '이름을 입력해 주세요.');
    //     return;
    //   }
    //   if (!selectedSchool?.id) {
    //     Alert.alert('알림', '재학 중인 학교를 선택해 주세요.');
    //     return;
    //   }
    //   if (!identityData.isVerified) {
    //     Alert.alert('알림', '전화번호 인증을 완료해 주세요.');
    //     return;
    //   }
    // } else if (blockIfIneligibleBirthDate(birthDate)) {
    //   return;
    // }

    setFormData((prev) => ({
      ...prev,
      name,
      birthDate,
      phoneNumber,
      schoolId: selectedSchool?.id,
      schoolName: selectedSchool?.name,
    }));
    setIdentityData((prev) => ({
      ...prev,
      name,
      birthDate,
      phoneNumber,
      isVerified: true,
    }));
    setCurrentStep(STEP.ACCOUNT);
  };

  const handleAccountNext = () => {
    // [임시-수정용] 검증 주석처리 (수정 끝나면 아래 블록 주석 해제)
    // if (
    //   !stepInfoData.username ||
    //   !stepInfoData.password ||
    //   !stepInfoData.passwordConfirm
    // ) {
    //   Alert.alert('알림', '아이디와 비밀번호를 입력해 주세요.');
    //   return;
    // }
    // if (!isValidUsername(stepInfoData.username)) {
    //   Alert.alert('알림', USERNAME_ERROR);
    //   return;
    // }
    // if (!isValidPassword(stepInfoData.password)) {
    //   Alert.alert('알림', PASSWORD_ERROR);
    //   return;
    // }
    // if (stepInfoData.password !== stepInfoData.passwordConfirm) {
    //   Alert.alert('알림', '비밀번호 확인이 일치하지 않습니다.');
    //   return;
    // }
    setFormData((prev) => ({ ...prev, ...stepInfoData }));
    setCurrentStep(STEP.VERIFICATION_METHOD);
  };

  const handleVerificationMethodSelect = (method) => {
    if (method === 'studentId') {
      setCurrentStep(STEP.STUDENT_VERIFY);
      return;
    }
    if (method === 'certificate') {
      setCurrentStep(STEP.CERTIFICATE_GUIDE);
    }
  };

  const handleCertificateProceed = () => {
    setCurrentStep(STEP.CERTIFICATE_SUBMIT);
  };

  const handleCertificateSubmit = () => {
    const { certificateUrl, accessNumber } = certificateData;
    if (!certificateUrl?.trim() || !accessNumber?.trim()) {
      Alert.alert('알림', '열람용 주소와 열람 번호를 모두 입력해 주세요.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      certificateUrl: certificateUrl.trim(),
      accessNumber: accessNumber.trim(),
    }));
    // TODO: 증명서 제출 API 연동 및 가입 완료 처리
  };

  const handleStudentVerified = (data) => {
    const birthDate = identity.birthDate;
    const level =
      data?.expectedLevel ||
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

    const recognized = {
      ...data,
      grade,
      class: classNum,
      graduationYear,
    };

    setRecognizedData(recognized);
    setStudentVerified(true);
    setStudentVerificationToken(
      data?.studentVerificationToken ||
        data?.verification?.studentVerificationToken ||
        null,
    );
    ocrIdentityAnchorRef.current = {
      name: identity.name?.trim() || '',
      phone: identity.phoneNumber || '',
      schoolId: selectedSchool?.id || formData.schoolId || '',
    };
    setFormData((prev) => ({
      ...prev,
      schoolLevel: level,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear: String(graduationYear),
      schoolId: selectedSchool?.id || prev.schoolId,
      schoolName: selectedSchool?.name || prev.schoolName,
    }));
  };

  const buildSignupPayload = (finalData) => {
    const birthDate = finalData.birthDate || identity.birthDate;
    const level =
      finalData.schoolLevel || inferExpectedSchoolLevel(birthDate);
    const enrollment = buildEnrollmentFromBirthDate(birthDate, level);
    const grade =
      Number(finalData.grade) ||
      Number(recognizedData?.grade) ||
      enrollment.grade ||
      1;
    const classNumber = Number(finalData.classNum) || Number(recognizedData?.class) || 1;
    const graduationYear =
      Number(finalData.graduationYear) ||
      Number(recognizedData?.graduationYear) ||
      enrollment.graduationYear;

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
      verificationMethod: 'student_id',
      consents: consentData.consents || {},
    };
    if (studentVerificationToken) {
      payload.studentVerificationToken = studentVerificationToken;
    }
    return payload;
  };

  const finishSignupAndEnterApp = async (username, password) => {
    const loginRes = await api.post('/api/auth/login', { username, password });
    const { token, studentVerificationStatus: status, rejectReason } =
      loginRes.data?.data || {};
    if (token) {
      await setAuthToken(token, { persist: true });
    }
    await login({
      studentVerificationStatus: status || 'PENDING',
      rejectReason: rejectReason || null,
    });
  };

  const handleComplete = async () => {
    const finalData = { ...formData, ...stepInfoData };

    if (!studentVerificationToken) {
      Alert.alert('알림', '학생증 촬영·제출을 먼저 완료해 주세요.');
      return;
    }
    if (!finalData.username || !finalData.password) {
      Alert.alert('알림', '계정 정보가 없습니다. 이전 단계를 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(finalData);
      await api.post('/api/auth/signup', payload);
      await finishSignupAndEnterApp(finalData.username, finalData.password);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '약관 동의';
      case STEP.IDENTITY:
        return '본인 확인';
      case STEP.ACCOUNT:
        return '계정 만들기';
      case STEP.VERIFICATION_METHOD:
        return '학생 인증';
      case STEP.STUDENT_VERIFY:
        return studentVerified ? '가입 마무리' : '학생증 인증';
      case STEP.CERTIFICATE_GUIDE:
        return '재학증명서 가이드';
      case STEP.CERTIFICATE_SUBMIT:
        return '재학증명서 제출';
      default:
        return '회원가입';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '서비스 이용을 위한 필수 동의 항목을 확인해 주세요';
      case STEP.IDENTITY:
        return '이름·생년월일·전화번호 인증과 재학 학교를 입력해 주세요';
      case STEP.ACCOUNT:
        return '로그인에 사용할 아이디와 비밀번호를 설정해 주세요';
      case STEP.VERIFICATION_METHOD:
        return '학생증 또는 재학증명서 중 하나를 선택해 주세요';
      case STEP.STUDENT_VERIFY:
        return studentVerified
          ? '학생증 제출이 완료되었습니다. 아래 [제출하기]로 가입을 마무리해 주세요.'
          : '학생증을 촬영해 제출해 주세요. 관리자 승인 후 서비스를 이용할 수 있습니다.';
      case STEP.CERTIFICATE_GUIDE:
        return '본 가이드는 네이버와 무관한 사용자 편의 안내입니다';
      case STEP.CERTIFICATE_SUBMIT:
        return '열람용 주소와 열람 번호를 입력해 주세요';
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
      case STEP.ACCOUNT:
        handleAccountNext();
        break;
      case STEP.STUDENT_VERIFY:
        if (studentVerified) handleComplete();
        break;
      case STEP.CERTIFICATE_SUBMIT:
        handleCertificateSubmit();
        break;
      default:
        break;
    }
  };

  const isPrimaryDisabled = () => {
    // [임시-수정용] 버튼 항상 활성화 (수정 끝나면 아래 2줄 주석 해제)
    return submitting;
    // eslint-disable-next-line no-unreachable
    if (
      SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST &&
      currentStep <= STEP.IDENTITY
    ) {
      if (submitting) return true;
      return false;
    }
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.IDENTITY && !selectedSchool?.id) return true;
    if (currentStep === STEP.IDENTITY) {
      if (!identityData.birthDate) return true;
      if (!identityData.isVerified) return true;
    }
    if (currentStep === STEP.ACCOUNT) {
      if (
        !stepInfoData.username ||
        !stepInfoData.password ||
        !stepInfoData.passwordConfirm ||
        !isValidUsername(stepInfoData.username) ||
        !isValidPassword(stepInfoData.password) ||
        stepInfoData.password !== stepInfoData.passwordConfirm
      ) {
        return true;
      }
    }
    if (currentStep === STEP.STUDENT_VERIFY && !studentVerified) return true;
    if (submitting) return true;
    return false;
  };

  const primaryLabel = () => {
    if (currentStep === STEP.STUDENT_VERIFY && studentVerified) return '제출하기';
    if (currentStep === STEP.CERTIFICATE_SUBMIT) return '제출하기';
    return '다음 단계';
  };

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) return;
    setConsentData({ allConsented: true, consents: {} });
    setIdentityData((prev) => ({
      ...OCR_TEST_MOCK_IDENTITY,
      ...prev,
      isVerified: true,
      isCodeSent: true,
    }));
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
            selectedSchool={selectedSchool}
            onSchoolSelect={setSelectedSchool}
            onChange={setIdentityData}
          />
        )}
        {currentStep === STEP.ACCOUNT && (
          <SignStep2
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            accountOnly
            onChange={setStepInfoData}
          />
        )}
        {currentStep === STEP.VERIFICATION_METHOD && (
          <SignStepVerificationMethod
            styles={styles}
            onSelect={handleVerificationMethodSelect}
          />
        )}
        {currentStep === STEP.CERTIFICATE_GUIDE && (
          <SignStepCertificateGuide
            styles={styles}
            onProceed={handleCertificateProceed}
          />
        )}
        {currentStep === STEP.CERTIFICATE_SUBMIT && (
          <SignStepCertificate
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            onChange={setCertificateData}
          />
        )}
        {currentStep === STEP.STUDENT_VERIFY && (
          <SignStepStudentIdVerify
            styles={styles}
            identity={identity}
            schoolId={selectedSchool?.id || formData.schoolId}
            alreadyVerified={studentVerified}
            onVerified={handleStudentVerified}
          />
        )}
      </View>

      {!hideFooter && (
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
    </SafeAreaView>
  );
};

export default Sign;
