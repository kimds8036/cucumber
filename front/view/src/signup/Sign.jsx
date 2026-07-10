import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
import SignStepAgeGate from './SignStepAgeGate';
import SignStepGuardianConsentModal from './SignStepGuardianConsentModal';
import SignStepGuardianIdentity from './SignStepGuardianIdentity';
import SignStepInicisIdentity from './SignStepInicisIdentity';
import SignStep2 from './SignStep2';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
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
  showTooOldForSignupAlert,
  showTooYoungForSignupAlert,
  showGuardianVerificationFailedAlert,
} from './authFeatureAlerts';
import {
  classifyBirthDateCase,
  isValidBirthDateString,
} from './signupBirthDatePolicy';
import {
  buildEnrollmentFromBirthDate,
  inferExpectedSchoolLevel,
  pickRandomProfileColorId,
} from './signupEnrollmentUtils';

/** OCR·가입 플로우 UI 테스트 — dev 빌드 기본 ON, .env로 끌 수 있음 */
const SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST =
  process.env.EXPO_PUBLIC_SIGNUP_TEST_MODE === 'true' ||
  (process.env.EXPO_PUBLIC_SIGNUP_TEST_MODE !== 'false' && __DEV__);

/** OCR API 호출용 임시 본인 정보 (SKIP 모드) */
const OCR_TEST_MOCK_IDENTITY = {
  name: '테스트학생',
  birthDate: '2010-05-15',
  phoneNumber: '01000000000',
};

const SIGNUP_TEST_MOCK_ACCOUNT = {
  username: 'testuser01',
  password: 'Test1234',
  passwordConfirm: 'Test1234',
};

const SIGNUP_TEST_MOCK_CERTIFICATE = {
  certificateUrl: 'https://example.com/test-certificate',
  accessNumber: '000000',
};

const SIGNUP_TEST_MOCK_STUDENT_VERIFICATION = {
  manualReview: true,
  studentVerificationToken: 'test-student-verification-token',
  verification: {
    studentVerificationToken: 'test-student-verification-token',
  },
};

const STEP = {
  CONSENT: 0,
  BIRTH_DATE: 1,
  GUARDIAN_IDENTITY: 2,
  IDENTITY: 3,
  ACCOUNT: 4,
  STUDENT_VERIFY: 5,
  CERTIFICATE_GUIDE: 6,
  CERTIFICATE_SUBMIT: 7,
};

function getSignupProgressStep(
  currentStep,
  { requiresGuardianVerification, studentVerified },
) {
  const total = requiresGuardianVerification ? 8 : 7;

  switch (currentStep) {
    case STEP.CONSENT:
      return { step: 1, total };
    case STEP.BIRTH_DATE:
      return { step: 2, total };
    case STEP.GUARDIAN_IDENTITY:
      return { step: 3, total };
    case STEP.IDENTITY:
      return { step: requiresGuardianVerification ? 4 : 3, total };
    case STEP.ACCOUNT:
      return { step: requiresGuardianVerification ? 5 : 4, total };
    case STEP.STUDENT_VERIFY:
      if (requiresGuardianVerification) {
        return { step: studentVerified ? 7 : 6, total };
      }
      return { step: studentVerified ? 6 : 5, total };
    case STEP.CERTIFICATE_GUIDE:
      return { step: requiresGuardianVerification ? 6 : 5, total };
    case STEP.CERTIFICATE_SUBMIT:
      return { step: total, total };
    default:
      return { step: 1, total };
  }
}

const Sign = ({ navigation }) => {
  const { login } = useAuth();
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(STEP.CONSENT);
  const [formData, setFormData] = useState({});
  const [identityData, setIdentityData] = useState({});
  const [birthDate, setBirthDate] = useState('');
  const [requiresGuardianVerification, setRequiresGuardianVerification] =
    useState(false);
  const [guardianVerified, setGuardianVerified] = useState(false);
  const [guardianVerifiedAt, setGuardianVerifiedAt] = useState(null);
  const [guardianInicisClientToken, setGuardianInicisClientToken] =
    useState(null);
  const [showGuardianConsentModal, setShowGuardianConsentModal] =
    useState(false);
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

  const progress = getSignupProgressStep(currentStep, {
    requiresGuardianVerification,
    studentVerified,
  });
  const progressWidth = (progress.step / progress.total) * 100;

  const isCameraStep = currentStep === STEP.STUDENT_VERIFY && !studentVerified;
  const hideFooter =
    (isCameraStep && !SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) ||
    currentStep === STEP.CERTIFICATE_GUIDE ||
    showGuardianConsentModal;

  const identity = useMemo(
    () => ({
      name: identityData.name || formData.name || '',
      birthDate: birthDate || identityData.birthDate || formData.birthDate || '',
      phoneNumber: identityData.phoneNumber || formData.phoneNumber || '',
    }),
    [identityData, formData, birthDate],
  );

  const goToLogin = useCallback(() => {
    resetTo('Login');
  }, [resetTo]);

  const applyBirthDateToState = useCallback((nextBirthDate) => {
    setBirthDate(nextBirthDate);
    setFormData((prev) => ({ ...prev, birthDate: nextBirthDate }));
    setIdentityData((prev) => ({ ...prev, birthDate: nextBirthDate }));
  }, []);

  const ocrIdentityAnchorRef = useRef({ name: '', phone: '' });

  /** C 케이스: 보호자 인증 없이 학생 인증 단계 우회 차단 */
  useEffect(() => {
    if (
      currentStep === STEP.IDENTITY &&
      requiresGuardianVerification &&
      !guardianVerified
    ) {
      setCurrentStep(STEP.GUARDIAN_IDENTITY);
    }
  }, [currentStep, requiresGuardianVerification, guardianVerified]);

  const handleBack = () => {
    if (currentStep === STEP.CONSENT) {
      navigation.goBack();
      return;
    }
    if (currentStep === STEP.BIRTH_DATE) {
      setShowGuardianConsentModal(false);
      setCurrentStep(STEP.CONSENT);
      return;
    }
    if (currentStep === STEP.GUARDIAN_IDENTITY) {
      setCurrentStep(STEP.BIRTH_DATE);
      return;
    }
    if (currentStep === STEP.IDENTITY) {
      if (requiresGuardianVerification) {
        setCurrentStep(STEP.GUARDIAN_IDENTITY);
      } else {
        setCurrentStep(STEP.BIRTH_DATE);
      }
      return;
    }
    if (currentStep === STEP.STUDENT_VERIFY) {
      setStudentVerified(false);
      setStudentVerificationToken(null);
      setRecognizedData(null);
      setCurrentStep(STEP.ACCOUNT);
      return;
    }
    if (currentStep === STEP.CERTIFICATE_GUIDE) {
      setCurrentStep(STEP.STUDENT_VERIFY);
      return;
    }
    if (currentStep === STEP.CERTIFICATE_SUBMIT) {
      setCurrentStep(STEP.CERTIFICATE_GUIDE);
      return;
    }
    setCurrentStep((s) => s - 1);
  };

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
    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST && !consentData.allConsented) {
      return;
    }
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      applyBirthDateToState(OCR_TEST_MOCK_IDENTITY.birthDate);
      setRequiresGuardianVerification(false);
      setGuardianVerified(false);
      setIdentityData((prev) => ({
        ...OCR_TEST_MOCK_IDENTITY,
        ...prev,
        isVerified: true,
      }));
      setCurrentStep(STEP.IDENTITY);
      return;
    }
    setCurrentStep(STEP.BIRTH_DATE);
  };

  const handleBirthDateNext = () => {
    const nextBirthDate = SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST
      ? birthDate || OCR_TEST_MOCK_IDENTITY.birthDate
      : birthDate;

    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (!isValidBirthDateString(nextBirthDate)) {
        Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
        return;
      }
    }

    const birthCase = classifyBirthDateCase(nextBirthDate);
    if (birthCase === 'invalid') {
      Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
      return;
    }
    if (birthCase === 'A') {
      showTooOldForSignupAlert(goToLogin);
      return;
    }
    if (birthCase === 'D') {
      showTooYoungForSignupAlert(goToLogin);
      return;
    }

    applyBirthDateToState(nextBirthDate);

    if (birthCase === 'C') {
      setRequiresGuardianVerification(true);
      setGuardianVerified(false);
      setGuardianVerifiedAt(null);
      setShowGuardianConsentModal(true);
      return;
    }

    setRequiresGuardianVerification(false);
    setGuardianVerified(false);
    setGuardianVerifiedAt(null);
    setCurrentStep(STEP.IDENTITY);
  };

  const handleGuardianConsentStart = () => {
    setShowGuardianConsentModal(false);
    setConsentData((prev) => ({
      ...prev,
      consents: { ...prev.consents, guardian: true },
      allConsented: true,
    }));
    setCurrentStep(STEP.GUARDIAN_IDENTITY);
  };

  const handleGuardianConsentLater = () => {
    setShowGuardianConsentModal(false);
    goToLogin();
  };

  const handleGuardianIdentityNext = () => {
    if (!guardianVerified) {
      showGuardianVerificationFailedAlert(goToLogin);
      return;
    }
    setCurrentStep(STEP.IDENTITY);
  };

  const handleGuardianDataChange = (data) => {
    if (data?.isVerified) {
      setGuardianVerified(true);
      setGuardianVerifiedAt(data.guardianVerifiedAt || new Date().toISOString());
    }
    if (data?.inicisClientToken) {
      setGuardianInicisClientToken(data.inicisClientToken);
    }
  };

  const handleStudentIdentityNext = () => {
    if (!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (requiresGuardianVerification && !guardianVerified) {
        setCurrentStep(STEP.GUARDIAN_IDENTITY);
        return;
      }
      if (!identityData.isVerified) {
        Alert.alert('알림', '본인인증을 완료해 주세요.');
        return;
      }
      if (!identityData.name?.trim()) {
        Alert.alert(
          '알림',
          '본인인증 이름을 확인하지 못했습니다. 본인인증을 다시 진행해 주세요.',
        );
        return;
      }
    }

    const name =
      identityData.name?.trim() ||
      (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST ? OCR_TEST_MOCK_IDENTITY.name : '');
    const phoneNumber =
      identityData.phoneNumber ||
      (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST
        ? OCR_TEST_MOCK_IDENTITY.phoneNumber
        : '');
    const resolvedBirthDate =
      identityData.birthDate || birthDate || formData.birthDate || '';

    setFormData((prev) => ({
      ...prev,
      name,
      birthDate: resolvedBirthDate,
      phoneNumber,
      requiresGuardianVerification,
      guardianVerifiedAt,
    }));
    setIdentityData((prev) => ({
      ...prev,
      name,
      birthDate: resolvedBirthDate,
      phoneNumber,
      isVerified: identityData.isVerified || SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST,
    }));
    if (resolvedBirthDate) {
      applyBirthDateToState(resolvedBirthDate);
    }
    setCurrentStep(STEP.ACCOUNT);
  };

  const handleAccountNext = () => {
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (!selectedSchool?.id || selectedSchool?.manual) {
        Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
        return;
      }
      setStepInfoData((prev) => ({
        ...SIGNUP_TEST_MOCK_ACCOUNT,
        ...prev,
        username: prev.username || SIGNUP_TEST_MOCK_ACCOUNT.username,
        password: prev.password || SIGNUP_TEST_MOCK_ACCOUNT.password,
        passwordConfirm:
          prev.passwordConfirm || SIGNUP_TEST_MOCK_ACCOUNT.passwordConfirm,
      }));
      setFormData((prev) => ({
        ...prev,
        ...SIGNUP_TEST_MOCK_ACCOUNT,
        ...stepInfoData,
        username: stepInfoData.username || SIGNUP_TEST_MOCK_ACCOUNT.username,
        password: stepInfoData.password || SIGNUP_TEST_MOCK_ACCOUNT.password,
        passwordConfirm:
          stepInfoData.passwordConfirm ||
          SIGNUP_TEST_MOCK_ACCOUNT.passwordConfirm,
        schoolId: selectedSchool?.id,
        schoolName: selectedSchool?.name,
      }));
      setCurrentStep(STEP.STUDENT_VERIFY);
      return;
    }

    if (
      !stepInfoData.username ||
      !stepInfoData.password ||
      !stepInfoData.passwordConfirm
    ) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    if (!isValidUsername(stepInfoData.username)) {
      Alert.alert('알림', USERNAME_ERROR);
      return;
    }
    if (!isValidPassword(stepInfoData.password)) {
      Alert.alert('알림', PASSWORD_ERROR);
      return;
    }
    if (stepInfoData.password !== stepInfoData.passwordConfirm) {
      Alert.alert('알림', '비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!selectedSchool?.id || selectedSchool?.manual) {
      Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      ...stepInfoData,
      schoolId: selectedSchool?.id,
      schoolName: selectedSchool?.name,
    }));
    setCurrentStep(STEP.STUDENT_VERIFY);
  };

  const handleCertificateGuideOpen = () => {
    setCurrentStep(STEP.CERTIFICATE_GUIDE);
  };

  const handleCertificateProceed = () => {
    setCurrentStep(STEP.CERTIFICATE_SUBMIT);
  };

  const handleCertificateSubmit = async () => {
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      setFormData((prev) => ({
        ...prev,
        certificateUrl:
          certificateData.certificateUrl?.trim() ||
          SIGNUP_TEST_MOCK_CERTIFICATE.certificateUrl,
        accessNumber:
          certificateData.accessNumber?.trim() ||
          SIGNUP_TEST_MOCK_CERTIFICATE.accessNumber,
      }));
      Alert.alert('테스트모드', '재학증명서 제출 검증을 건너뛰었습니다.');
      return;
    }

    const certificateViewUrl = certificateData.certificateUrl?.trim();
    const certificateAccessCode = certificateData.accessNumber?.trim();
    if (!certificateViewUrl || !certificateAccessCode) {
      Alert.alert('알림', '열람용 주소와 열람 번호를 모두 입력해 주세요.');
      return;
    }

    const finalData = {
      ...formData,
      ...stepInfoData,
      certificateUrl: certificateViewUrl,
      accessNumber: certificateAccessCode,
    };
    if (!finalData.username || !finalData.password) {
      Alert.alert('알림', '계정 정보가 없습니다. 이전 단계를 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(finalData, null, null, {
        verificationMethod: 'certificate',
        certificateViewUrl,
        certificateAccessCode,
      });
      await api.post('/api/auth/signup', payload);
      Alert.alert(
        '알림',
        '재학증명서 제출이 완료되었습니다. 관리자 검수 후 서비스를 이용할 수 있습니다.',
        [{ text: '확인', onPress: () => resetTo('Login') }],
      );
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buildStudentVerificationSnapshot = (data) => {
    const resolvedBirthDate = identity.birthDate;
    const level =
      data?.expectedLevel ||
      data?.verification?.expectedLevel ||
      inferExpectedSchoolLevel(resolvedBirthDate);
    const enrollment = buildEnrollmentFromBirthDate(resolvedBirthDate, level);
    const grade =
      data?.verification?.suggestedGrade ??
      data?.grade ??
      enrollment.grade ??
      1;
    const classNum =
      data?.verification?.suggestedClassNumber ?? data?.class ?? 1;
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

    const token =
      data?.studentVerificationToken ||
      data?.verification?.studentVerificationToken ||
      null;
    const formPatch = {
      schoolLevel: level,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear: String(graduationYear),
      schoolId: selectedSchool?.id || formData.schoolId,
      schoolName: selectedSchool?.name || formData.schoolName,
    };

    return { recognized, token, formPatch };
  };

  const handleStudentVerified = async (data) => {
    const { recognized, token, formPatch } =
      buildStudentVerificationSnapshot(data);

    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      Alert.alert(
        '학생증 제출 완료!',
        '관리자 승인 후 서비스를 이용할 수 있습니다',
        [{ text: '확인', onPress: () => resetTo('Login') }],
      );
      return;
    }

    const finalData = {
      ...formData,
      ...stepInfoData,
      ...formPatch,
    };

    if (!token) {
      Alert.alert('알림', '학생증 인증 정보가 없습니다. 다시 제출해 주세요.');
      return;
    }
    if (!finalData.username || !finalData.password) {
      Alert.alert('알림', '계정 정보가 없습니다. 이전 단계를 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(finalData, token, recognized);
      await api.post('/api/auth/signup', payload);
      Alert.alert(
        '알림',
        '학생증 제출이 완료되었습니다! 관리자 승인 후 서비스를 이용할 수 있습니다',
        [{ text: '확인', onPress: () => resetTo('Login') }],
      );
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buildSignupPayload = (
    finalData,
    verificationToken = studentVerificationToken,
    verificationData = recognizedData,
    options = {},
  ) => {
    const resolvedBirthDate =
      identityData.birthDate || finalData.birthDate || identity.birthDate;
    const level = finalData.schoolLevel || inferExpectedSchoolLevel(resolvedBirthDate);
    const enrollment = buildEnrollmentFromBirthDate(resolvedBirthDate, level);
    const grade =
      Number(finalData.grade) ||
      Number(verificationData?.grade) ||
      enrollment.grade ||
      1;
    const classNumber =
      Number(finalData.classNum) || Number(verificationData?.class) || 1;
    const graduationYear =
      Number(finalData.graduationYear) ||
      Number(verificationData?.graduationYear) ||
      enrollment.graduationYear;

    const verificationMethod =
      options.verificationMethod || 'student_id';

    const payload = {
      username: finalData.username,
      password: finalData.password,
      name: (identityData.name || finalData.name || identity.name || '').trim(),
      phone: String(
        identityData.phoneNumber ||
          finalData.phoneNumber ||
          identity.phoneNumber ||
          '',
      ).replace(/\D/g, ''),
      birthDate:
        identityData.birthDate ||
        finalData.birthDate ||
        identity.birthDate,
      schoolId: finalData.schoolId,
      grade,
      classNumber,
      graduationYear,
      colorId: pickRandomProfileColorId(),
      verificationMethod,
      consents: consentData.consents || {},
    };

    if (identityData.inicisClientToken) {
      payload.studentInicisClientToken = identityData.inicisClientToken;
    }
    if (guardianInicisClientToken) {
      payload.guardianInicisClientToken = guardianInicisClientToken;
    }
    if (verificationMethod === 'certificate') {
      payload.certificateViewUrl =
        options.certificateViewUrl ||
        finalData.certificateUrl?.trim();
      payload.certificateAccessCode =
        options.certificateAccessCode ||
        finalData.accessNumber?.trim();
      payload.claimedSchoolName =
        finalData.schoolName || selectedSchool?.name || null;
    } else if (verificationToken) {
      payload.studentVerificationToken = verificationToken;
    }
    return payload;
  };

  const finishSignupAndEnterApp = async (username, password) => {
    const loginRes = await api.post('/api/auth/login', { username, password });
    const {
      token,
      studentVerificationStatus: status,
      rejectReason,
    } = loginRes.data?.data || {};
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

    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      Alert.alert('테스트모드', '회원가입 제출 API 호출을 건너뛰었습니다.');
      return;
    }

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
      case STEP.BIRTH_DATE:
        return '생년월일 입력';
      case STEP.GUARDIAN_IDENTITY:
        return '보호자 본인인증';
      case STEP.IDENTITY:
        return '본인인증';
      case STEP.ACCOUNT:
        return '계정 만들기';
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
      case STEP.BIRTH_DATE:
        return '가입 가능 연령 확인을 위해 생년월일을 입력해 주세요';
      case STEP.GUARDIAN_IDENTITY:
        return '법정대리인(보호자)의 본인인증과 동의가 필요해요';
      case STEP.IDENTITY:
        return 'KG 이니시스 간편인증으로 본인 확인을 진행해 주세요';
      case STEP.ACCOUNT:
        return '아이디·비밀번호를 설정하고 재학 중인 학교를 선택해 주세요';
      case STEP.STUDENT_VERIFY:
        return studentVerified
          ? '학생증 제출이 완료되었습니다. 아래 [제출하기]로 가입을 마무리해 주세요.'
          : '학생증을 촬영해 제출하면 승인 후 이용할 수 있어요.';
      case STEP.CERTIFICATE_GUIDE:
        return '본 가이드는 네이버와 무관한 사용자 편의 안내입니다';
      case STEP.CERTIFICATE_SUBMIT:
        return '발급받은 열람용 주소와 열람 번호를 입력해 주세요';
      default:
        return '';
    }
  };

  const handlePrimaryPress = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        handleConsentNext();
        break;
      case STEP.BIRTH_DATE:
        handleBirthDateNext();
        break;
      case STEP.GUARDIAN_IDENTITY:
        handleGuardianIdentityNext();
        break;
      case STEP.IDENTITY:
        handleStudentIdentityNext();
        break;
      case STEP.ACCOUNT:
        handleAccountNext();
        break;
      case STEP.STUDENT_VERIFY:
        if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST && !studentVerified) {
          handleStudentVerified(SIGNUP_TEST_MOCK_STUDENT_VERIFICATION);
        } else if (studentVerified) {
          handleComplete();
        }
        break;
      case STEP.CERTIFICATE_SUBMIT:
        handleCertificateSubmit();
        break;
      default:
        break;
    }
  };

  const isPrimaryDisabled = () => {
    if (submitting) return true;
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (currentStep === STEP.ACCOUNT) {
        if (!selectedSchool?.id || selectedSchool?.manual) return true;
      }
      return false;
    }
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.BIRTH_DATE) {
      if (!birthDate || !isValidBirthDateString(birthDate)) return true;
    }
    if (currentStep === STEP.GUARDIAN_IDENTITY && !guardianVerified) return true;
    if (currentStep === STEP.IDENTITY) {
      if (!identityData.isVerified) return true;
    }
    if (currentStep === STEP.ACCOUNT) {
      if (!selectedSchool?.id || selectedSchool?.manual) return true;
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
    if (
      SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST &&
      currentStep === STEP.STUDENT_VERIFY &&
      !studentVerified
    ) {
      return '테스트 인증 완료';
    }
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
    applyBirthDateToState(OCR_TEST_MOCK_IDENTITY.birthDate);
    setIdentityData((prev) => ({
      ...OCR_TEST_MOCK_IDENTITY,
      ...prev,
      isVerified: true,
    }));
  }, [applyBirthDateToState]);

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
            selectedAgeGroup={requiresGuardianVerification ? 'under14' : 'over14'}
            onChange={setConsentData}
          />
        )}
        {currentStep === STEP.BIRTH_DATE && (
          <SignStepAgeGate
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            initialBirthDate={birthDate}
            onBirthDateChange={setBirthDate}
          />
        )}
        {currentStep === STEP.GUARDIAN_IDENTITY && (
          <SignStepGuardianIdentity
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            initialVerified={guardianVerified}
            onChange={handleGuardianDataChange}
            onVerificationFailed={() =>
              showGuardianVerificationFailedAlert(goToLogin)
            }
          />
        )}
        {currentStep === STEP.IDENTITY && (
          <SignStepInicisIdentity
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            initialData={identityData}
            onChange={setIdentityData}
            requiresGuardianVerification={requiresGuardianVerification}
            testMode={SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST}
            autoStart={!SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST}
          />
        )}
        {currentStep === STEP.ACCOUNT && (
          <SignStep2
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            accountOnly
            showSchoolField
            selectedSchool={selectedSchool}
            onSchoolSelect={setSelectedSchool}
            onChange={setStepInfoData}
          />
        )}
        {currentStep === STEP.CERTIFICATE_GUIDE && (
          <SignStepCertificateGuide
            styles={styles}
            onProceed={handleCertificateProceed}
            testMode={SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST}
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
            onCertificateGuide={handleCertificateGuideOpen}
          />
        )}
      </View>

      <SignStepGuardianConsentModal
        visible={showGuardianConsentModal}
        normalize={normalize}
        onStart={handleGuardianConsentStart}
        onLater={handleGuardianConsentLater}
      />

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
