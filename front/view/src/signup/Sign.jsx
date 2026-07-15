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
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepConsent from './SignStepConsent';
import SignStepAgeGate from './SignStepAgeGate';
import SignStepGuardianConsentModal from './SignStepGuardianConsentModal';
import SignupStudentIdentityIntroModal from './SignupStudentIdentityIntroModal';
import SignupIdentityVerifyingOverlay from './SignupIdentityVerifyingOverlay';
import SignupBlockingAlertModal from './SignupBlockingAlertModal';
import SignStep2 from './SignStep2';
import SignStepSchoolSelect from './SignStepSchoolSelect';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import SignStepCertificateGuide from './SignStepCertificateGuide';
import SignStepCertificate from './SignStepCertificate';
import { api, setAuthToken } from '../../../utils/api';
import {
  fetchInicisServerEnabled,
  getPendingInicisSession,
  isInicisClientEnabled,
  resumePendingInicisFlow,
  runInicisIdentityFlow,
  clearPendingInicisSession,
  cancelInicisFlow,
  openPendingInicisBrowser,
  dismissInicisBrowserSafely,
  waitForPresentationLayerRelease,
} from '../../../services/inicisAuth';
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
} from './authFeatureAlerts';
import {
  classifyBirthDateCase,
  isValidBirthDateString,
  birthDatesMatch,
  normalizeBirthDateForCompare,
} from './signupBirthDatePolicy';
import {
  buildEnrollmentFromBirthDate,
  inferExpectedSchoolLevel,
  pickRandomProfileColorId,
} from './signupEnrollmentUtils';

/**
 * OCR·가입 플로우 UI 테스트 스킵
 * - __DEV__ 에서만 허용 (release/AAB 는 절대 SKIP 불가)
 * - 명시적으로 EXPO_PUBLIC_SIGNUP_TEST_MODE=true 일 때만 ON
 */
const SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST =
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SIGNUP_TEST_MODE || '')
    .toLowerCase()
    .trim() === 'true';

/**
 * 성인(과연령) 생년월일 차단 완화 — 팀 내부 테스트용
 * - __DEV__ + EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=true 일 때만
 * - release/AAB 에서는 항상 학생 연령만 허용
 */
const ALLOW_ADULT_SIGNUP_IN_DEV =
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || '')
    .toLowerCase()
    .trim() === 'true';

function getAdultTestEnrollmentFallback() {
  return {
    schoolLevel: 'high',
    grade: 3,
    classNum: 1,
    graduationYear: new Date().getFullYear() + 1,
  };
}

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

const INICIS_MOCK_PHONE = '01000000000';

const INICIS_OVERLAY_TITLE = {
  GUARDIAN: '보호자 본인인증 진행 중',
  STUDENT: '본인인증 진행 중',
};

const STEP = {
  CONSENT: 0,
  BIRTH_DATE: 1,
  ACCOUNT: 2,
  SCHOOL_SELECT: 3,
  STUDENT_VERIFY: 4,
  CERTIFICATE_GUIDE: 5,
  CERTIFICATE_SUBMIT: 6,
};

function getSignupProgressStep(currentStep, { studentVerified }) {
  const total = 6;

  switch (currentStep) {
    case STEP.CONSENT:
      return { step: 1, total };
    case STEP.BIRTH_DATE:
      return { step: 2, total };
    case STEP.ACCOUNT:
      return { step: 3, total };
    case STEP.SCHOOL_SELECT:
      return { step: 4, total };
    case STEP.STUDENT_VERIFY:
      return { step: studentVerified ? 6 : 5, total };
    case STEP.CERTIFICATE_GUIDE:
      return { step: 5, total };
    case STEP.CERTIFICATE_SUBMIT:
      return { step: 6, total };
    default:
      return { step: 1, total };
  }
}

const Sign = ({ navigation }) => {
  const route = useRoute();
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
  const [showStudentIdentityIntroModal, setShowStudentIdentityIntroModal] =
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
  const [inicisOverlayVisible, setInicisOverlayVisible] = useState(false);
  const [inicisOverlayTitle, setInicisOverlayTitle] = useState(
    INICIS_OVERLAY_TITLE.STUDENT,
  );
  const [inicisManualOpening, setInicisManualOpening] = useState(false);
  const [blockingAlert, setBlockingAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: '확인', onPress: () => {} }],
  });

  const inicisResumeStepRef = useRef(STEP.BIRTH_DATE);
  const inicisFlowActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialResumeInicisRef = useRef(route.params?.resumeInicis === true);
  const resumeInicisFromPendingRef = useRef(async () => {});
  const birthDateInputRef = useRef('');
  const inicisClientTokenRef = useRef(null);
  const guardianModalPendingActionRef = useRef(null);

  const endInicisOverlay = useCallback(async () => {
    await dismissInicisBrowserSafely();
    inicisFlowActiveRef.current = false;
    if (isMountedRef.current) {
      setInicisOverlayVisible(false);
      setInicisManualOpening(false);
      setShowStudentIdentityIntroModal(false);
      setShowGuardianConsentModal(false);
    }
    await waitForPresentationLayerRelease();
  }, []);

  const closeBlockingAlert = useCallback(() => {
    setBlockingAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const showInicisAlertAfterOverlay = useCallback(
    (title, message, buttons) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          if (!isMountedRef.current) return;
          const resolvedButtons = buttons?.length
            ? buttons.map((btn) => ({
                text: btn.text,
                onPress: () => {
                  closeBlockingAlert();
                  btn.onPress?.();
                },
              }))
            : [
                {
                  text: '확인',
                  onPress: closeBlockingAlert,
                },
              ];
          setBlockingAlert({
            visible: true,
            title,
            message,
            buttons: resolvedButtons,
          });
        }, 280);
      });
    },
    [closeBlockingAlert],
  );

  const evaluateStudentVerifyResult = useCallback(
    (result) => {
      const profile = result?.profile || {};
      const verifiedName = String(profile.name || '').trim();
      if (!verifiedName) {
        return {
          ok: false,
          title: '본인인증 오류',
          message:
            '인증은 완료되었으나 이름 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      const enteredBirthDate =
        birthDateInputRef.current ||
        birthDate ||
        identityData.birthDate ||
        formData.birthDate ||
        '';
      const verifiedBirthDate = normalizeBirthDateForCompare(profile.birthDate);

      if (!verifiedBirthDate) {
        return {
          ok: false,
          title: '본인인증 오류',
          message:
            '인증 결과에서 생년월일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (!birthDatesMatch(enteredBirthDate, verifiedBirthDate)) {
        return {
          ok: false,
          title: '본인인증 실패',
          message:
            '입력하신 생년월일과 본인인증 정보가 일치하지 않습니다.\n생년월일을 확인한 뒤 다시 시도해 주세요.',
        };
      }

      const verifiedPhone = String(profile.phoneNumber || '').replace(/\D/g, '');
      if (!verifiedPhone || verifiedPhone.length < 10) {
        return {
          ok: false,
          title: '본인인증 오류',
          message:
            '인증 결과에서 전화번호를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        };
      }

      if (result?.clientToken) {
        inicisClientTokenRef.current = result.clientToken;
      }

      return {
        ok: true,
        nextIdentity: {
          name: verifiedName,
          phoneNumber: verifiedPhone,
          birthDate: verifiedBirthDate,
          isVerified: true,
          inicisClientToken: result.clientToken,
        },
      };
    },
    [birthDate, formData.birthDate, identityData.birthDate],
  );

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  const progress = getSignupProgressStep(currentStep, { studentVerified });
  const progressWidth = (progress.step / progress.total) * 100;

  const isCameraStep = currentStep === STEP.STUDENT_VERIFY && !studentVerified;
  const hideFooter =
    (isCameraStep && !SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) ||
    currentStep === STEP.CERTIFICATE_GUIDE ||
    showGuardianConsentModal ||
    showStudentIdentityIntroModal ||
    inicisOverlayVisible;

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

  const showGuardianIncompleteAfterOverlay = useCallback(
    (message) => {
      showInicisAlertAfterOverlay(
        '보호자 인증 미완료',
        message ||
          '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
        [{ text: '돌아가기', onPress: goToLogin }],
      );
    },
    [goToLogin, showInicisAlertAfterOverlay],
  );

  const handleInicisOverlayOpenManually = useCallback(async () => {
    if (inicisManualOpening) return;
    setInicisManualOpening(true);
    try {
      await openPendingInicisBrowser();
    } catch (error) {
      showInicisAlertAfterOverlay(
        '알림',
        error?.message || '인증 페이지를 열 수 없습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      await dismissInicisBrowserSafely();
      if (isMountedRef.current) {
        setInicisManualOpening(false);
      }
    }
  }, [inicisManualOpening, showInicisAlertAfterOverlay]);

  const handleInicisOverlayCancel = useCallback(async () => {
    const wasGuardian = inicisOverlayTitle === INICIS_OVERLAY_TITLE.GUARDIAN;
    const wasStudent = inicisOverlayTitle === INICIS_OVERLAY_TITLE.STUDENT;
    cancelInicisFlow();
    await endInicisOverlay();
    await clearPendingInicisSession();
    if (wasGuardian) {
      showGuardianIncompleteAfterOverlay();
      return;
    }
    if (wasStudent) {
      showInicisAlertAfterOverlay(
        '본인인증 미완료',
        '본인인증이 완료되지 않았습니다. 다시 시도해 주세요.',
      );
    }
  }, [
    endInicisOverlay,
    inicisOverlayTitle,
    showGuardianIncompleteAfterOverlay,
    showInicisAlertAfterOverlay,
  ]);

  const applyBirthDateToState = useCallback((nextBirthDate) => {
    birthDateInputRef.current = nextBirthDate;
    setBirthDate(nextBirthDate);
    setFormData((prev) => ({ ...prev, birthDate: nextBirthDate }));
    setIdentityData((prev) => ({ ...prev, birthDate: nextBirthDate }));
  }, []);

  const resetInicisIdentityState = useCallback(() => {
    inicisClientTokenRef.current = null;
    setIdentityData({});
    setGuardianInicisClientToken(null);
    setGuardianVerified(false);
    setGuardianVerifiedAt(null);
    void clearPendingInicisSession();
    cancelInicisFlow();
  }, []);

  const handleBirthDateChange = useCallback(
    (nextBirthDate) => {
      const prevBirthDate =
        birthDateInputRef.current ||
        birthDate ||
        identityData.birthDate ||
        formData.birthDate ||
        '';
      const birthChanged =
        normalizeBirthDateForCompare(prevBirthDate) !==
        normalizeBirthDateForCompare(nextBirthDate);

      setBirthDate(nextBirthDate);
      birthDateInputRef.current = nextBirthDate;

      if (
        birthChanged &&
        (identityData.isVerified ||
          identityData.inicisClientToken ||
          inicisClientTokenRef.current ||
          guardianInicisClientToken)
      ) {
        resetInicisIdentityState();
        setFormData((prev) => ({
          ...prev,
          birthDate: nextBirthDate,
          name: '',
          phoneNumber: '',
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, birthDate: nextBirthDate }));
      setIdentityData((prev) => ({ ...prev, birthDate: nextBirthDate }));
    },
    [
      birthDate,
      formData.birthDate,
      guardianInicisClientToken,
      identityData.birthDate,
      identityData.inicisClientToken,
      identityData.isVerified,
      resetInicisIdentityState,
    ],
  );

  const ocrIdentityAnchorRef = useRef({ name: '', phone: '' });

  const advanceToAccountAfterIdentity = useCallback(
    (overrideIdentity = {}) => {
      const mergedIdentity = { ...identityData, ...overrideIdentity };
      const name =
        mergedIdentity.name?.trim() ||
        (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST
          ? OCR_TEST_MOCK_IDENTITY.name
          : '');
      const phoneNumber =
        mergedIdentity.phoneNumber ||
        (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST
          ? OCR_TEST_MOCK_IDENTITY.phoneNumber
          : '');
      const resolvedBirthDate =
        mergedIdentity.birthDate || birthDate || formData.birthDate || '';

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
        isVerified:
          mergedIdentity.isVerified || SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST,
        inicisClientToken: mergedIdentity.inicisClientToken ?? prev.inicisClientToken,
      }));
      if (resolvedBirthDate) {
        applyBirthDateToState(resolvedBirthDate);
      }
      setCurrentStep(STEP.ACCOUNT);
    },
    [
      applyBirthDateToState,
      birthDate,
      formData.birthDate,
      guardianVerifiedAt,
      identityData,
      requiresGuardianVerification,
    ],
  );

  const commitStudentVerifySuccess = useCallback(
    (evaluation) => {
      if (!evaluation?.ok || !evaluation.nextIdentity) return;
      const { nextIdentity } = evaluation;
      setIdentityData((prev) => ({ ...prev, ...nextIdentity }));
      advanceToAccountAfterIdentity(nextIdentity);
    },
    [advanceToAccountAfterIdentity],
  );

  const showStudentVerifyErrorAfterOverlay = useCallback(
    (error) => {
      if (error?.code === 'CANCELLED') return;
      if (error?.code === 'IN_PROGRESS') {
        showInicisAlertAfterOverlay('알림', '이미 본인인증이 진행 중입니다.');
        return;
      }
      if (error?.code === 'TIMEOUT') {
        showInicisAlertAfterOverlay(
          '본인인증 미완료',
          '본인인증이 완료되지 않았습니다. 다시 시도해 주세요.',
        );
        return;
      }
      if (error?.code === 'fail' || error?.code === 'expired') {
        showInicisAlertAfterOverlay(
          '본인인증 실패',
          error?.message || '본인인증에 실패했습니다. 다시 시도해 주세요.',
        );
        return;
      }
      showInicisAlertAfterOverlay(
        '본인인증 오류',
        error?.message || '본인인증을 진행할 수 없습니다.',
      );
    },
    [showInicisAlertAfterOverlay],
  );

  const showGuardianVerifyErrorAfterOverlay = useCallback(
    (error) => {
      if (error?.code === 'CANCELLED') return;
      if (error?.code === 'IN_PROGRESS') {
        showInicisAlertAfterOverlay('알림', '이미 본인인증이 진행 중입니다.');
        return;
      }
      if (error?.code === 'TIMEOUT') {
        showGuardianIncompleteAfterOverlay(
          '보호자 본인인증이 완료되지 않았습니다. 다시 시도해 주세요.',
        );
        return;
      }
      showGuardianIncompleteAfterOverlay(
        error?.message ||
          '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
      );
    },
    [showGuardianIncompleteAfterOverlay, showInicisAlertAfterOverlay],
  );

  const applyGuardianVerifySuccess = useCallback((result) => {
    const verifiedAt = new Date().toISOString();
    setGuardianVerified(true);
    setGuardianVerifiedAt(verifiedAt);
    setGuardianInicisClientToken(result.clientToken);
    return true;
  }, []);

  const executeInicisFlow = useCallback(async (purpose) => {
    const pending = await getPendingInicisSession();
    if (pending?.purpose === purpose) {
      return resumePendingInicisFlow(purpose);
    }
    return runInicisIdentityFlow(purpose);
  }, []);

  const runStudentIdentityVerificationCore = useCallback(async () => {
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      return {
        ok: true,
        nextIdentity: {
          ...OCR_TEST_MOCK_IDENTITY,
          isVerified: true,
        },
      };
    }

    const clientOn = isInicisClientEnabled();
    let serverOn = false;
    if (clientOn) {
      serverOn = await fetchInicisServerEnabled();
    }
    const useReal = clientOn && serverOn;

    if (!useReal) {
      if (clientOn) {
        return {
          ok: false,
          title: '본인인증 오류',
          message:
            '본인인증 서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        ok: true,
        mockAlert: '본인인증이 완료되었습니다. (테스트 mock)',
        nextIdentity: {
          name: '테스트학생',
          phoneNumber: INICIS_MOCK_PHONE,
          birthDate: OCR_TEST_MOCK_IDENTITY.birthDate,
          isVerified: true,
        },
      };
    }

    const result = await executeInicisFlow('student_signup');
    if (!result) return null;
    return evaluateStudentVerifyResult(result);
  }, [evaluateStudentVerifyResult, executeInicisFlow]);

  const runGuardianIdentityVerificationCore = useCallback(async () => {
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      applyGuardianVerifySuccess({
        clientToken: 'test-guardian-token',
        profile: {},
      });
      return;
    }

    const clientOn = isInicisClientEnabled();
    let serverOn = false;
    if (clientOn) {
      serverOn = await fetchInicisServerEnabled();
    }
    const useReal = clientOn && serverOn;

    if (!useReal) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      applyGuardianVerifySuccess({ clientToken: null, profile: {} });
      Alert.alert('알림', '보호자 본인인증이 완료되었습니다. (테스트 mock)');
      return;
    }

    const result = await executeInicisFlow('guardian_consent');
    if (result) {
      applyGuardianVerifySuccess(result);
    }
  }, [applyGuardianVerifySuccess, executeInicisFlow]);

  const runStudentIdentityVerification = useCallback(
    async (resumeStep = STEP.BIRTH_DATE) => {
      if (inicisFlowActiveRef.current) return;
      inicisResumeStepRef.current = resumeStep;
      inicisFlowActiveRef.current = true;
      setInicisOverlayTitle(INICIS_OVERLAY_TITLE.STUDENT);
      setInicisOverlayVisible(true);

      let evaluation = null;
      let flowError = null;
      try {
        evaluation = await runStudentIdentityVerificationCore();
      } catch (error) {
        flowError = error;
      } finally {
        await endInicisOverlay();
      }

      if (flowError?.code !== 'CANCELLED' && flowError) {
        showStudentVerifyErrorAfterOverlay(flowError);
        return;
      }

      if (evaluation?.mockAlert) {
        showInicisAlertAfterOverlay('알림', evaluation.mockAlert);
      }
      if (evaluation && !evaluation.ok) {
        showInicisAlertAfterOverlay(evaluation.title, evaluation.message);
        return;
      }
      if (evaluation?.ok) {
        commitStudentVerifySuccess(evaluation);
      }
    },
    [
      commitStudentVerifySuccess,
      endInicisOverlay,
      runStudentIdentityVerificationCore,
      showInicisAlertAfterOverlay,
      showStudentVerifyErrorAfterOverlay,
    ],
  );

  const promptStudentIdentityAfterGuardian = useCallback(async () => {
    await endInicisOverlay();
    setShowStudentIdentityIntroModal(true);
  }, [endInicisOverlay]);

  const runGuardianAndStudentVerification = useCallback(async () => {
    if (inicisFlowActiveRef.current) return;
    inicisResumeStepRef.current = STEP.BIRTH_DATE;
    inicisFlowActiveRef.current = true;
    setInicisOverlayTitle(INICIS_OVERLAY_TITLE.GUARDIAN);
    setInicisOverlayVisible(true);

    try {
      await runGuardianIdentityVerificationCore();
      await promptStudentIdentityAfterGuardian();
    } catch (error) {
      await endInicisOverlay();
      if (error?.code !== 'CANCELLED') {
        showGuardianVerifyErrorAfterOverlay(error);
      }
    }
  }, [
    endInicisOverlay,
    promptStudentIdentityAfterGuardian,
    runGuardianIdentityVerificationCore,
    showGuardianVerifyErrorAfterOverlay,
  ]);

  const handleStudentIdentityIntroStart = () => {
    setShowStudentIdentityIntroModal(false);
    InteractionManager.runAfterInteractions(() => {
      void runStudentIdentityVerification(STEP.BIRTH_DATE);
    });
  };

  const handleStudentIdentityIntroCancel = () => {
    setShowStudentIdentityIntroModal(false);
  };

  const resumeInicisFromPending = useCallback(async () => {
    if (inicisFlowActiveRef.current || SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      return;
    }
    const pending = await getPendingInicisSession();
    if (!pending) return;

    inicisResumeStepRef.current = STEP.BIRTH_DATE;
    inicisFlowActiveRef.current = true;

    if (pending.purpose === 'guardian_consent') {
      setRequiresGuardianVerification(true);
      setCurrentStep(STEP.BIRTH_DATE);
      setInicisOverlayTitle(INICIS_OVERLAY_TITLE.GUARDIAN);
      setInicisOverlayVisible(true);
      try {
        const result = await resumePendingInicisFlow('guardian_consent');
        if (result) {
          applyGuardianVerifySuccess(result);
          await promptStudentIdentityAfterGuardian();
        }
      } catch (error) {
        await endInicisOverlay();
        if (error?.code !== 'CANCELLED') {
          showGuardianVerifyErrorAfterOverlay(error);
        }
      }
      return;
    }

    if (pending.purpose === 'student_signup') {
      setInicisOverlayTitle(INICIS_OVERLAY_TITLE.STUDENT);
      setInicisOverlayVisible(true);
      let evaluation = null;
      let flowError = null;
      try {
        const result = await resumePendingInicisFlow('student_signup');
        if (result) {
          evaluation = evaluateStudentVerifyResult(result);
        }
      } catch (error) {
        flowError = error;
      } finally {
        await endInicisOverlay();
      }
      if (flowError?.code !== 'CANCELLED' && flowError) {
        showStudentVerifyErrorAfterOverlay(flowError);
        return;
      }
      if (evaluation && !evaluation.ok) {
        showInicisAlertAfterOverlay(evaluation.title, evaluation.message);
        return;
      }
      if (evaluation?.ok) {
        commitStudentVerifySuccess(evaluation);
      }
    }
  }, [
    applyGuardianVerifySuccess,
    commitStudentVerifySuccess,
    endInicisOverlay,
    evaluateStudentVerifyResult,
    promptStudentIdentityAfterGuardian,
    showGuardianVerifyErrorAfterOverlay,
    showInicisAlertAfterOverlay,
    showStudentVerifyErrorAfterOverlay,
  ]);

  useEffect(() => {
    resumeInicisFromPendingRef.current = resumeInicisFromPending;
  }, [resumeInicisFromPending]);

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    const shouldResume = initialResumeInicisRef.current;

    (async () => {
      if (shouldResume) {
        navigation.setParams({ resumeInicis: undefined });
        if (!cancelled) {
          await resumeInicisFromPendingRef.current();
        }
        return;
      }

      cancelInicisFlow();
      await clearPendingInicisSession();
      if (!cancelled) {
        await endInicisOverlay();
      }
    })();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      guardianModalPendingActionRef.current = null;
      cancelInicisFlow();
    };
    // 마운트 1회만 — resumeInicisFromPending 의존 시 setParams 무한 루프
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    if (showStudentIdentityIntroModal) {
      setShowStudentIdentityIntroModal(false);
      return;
    }
    if (inicisOverlayVisible) {
      Alert.alert(
        '본인인증 중단',
        '본인인증을 중단하고 이전 단계로 돌아갈까요?',
        [
          { text: '계속하기', style: 'cancel' },
          {
            text: '중단',
            style: 'destructive',
            onPress: () => {
              void handleInicisOverlayCancel();
            },
          },
        ],
      );
      return;
    }
    if (currentStep === STEP.CONSENT) {
      cancelInicisFlow();
      void clearPendingInicisSession();
      navigation.goBack();
      return;
    }
    if (currentStep === STEP.BIRTH_DATE) {
      setShowGuardianConsentModal(false);
      setCurrentStep(STEP.CONSENT);
      return;
    }
    if (currentStep === STEP.ACCOUNT) {
      setCurrentStep(STEP.BIRTH_DATE);
      return;
    }
    if (currentStep === STEP.SCHOOL_SELECT) {
      setCurrentStep(STEP.ACCOUNT);
      return;
    }
    if (currentStep === STEP.STUDENT_VERIFY) {
      setStudentVerified(false);
      setStudentVerificationToken(null);
      setRecognizedData(null);
      setCurrentStep(STEP.SCHOOL_SELECT);
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
      advanceToAccountAfterIdentity({
        ...OCR_TEST_MOCK_IDENTITY,
        isVerified: true,
      });
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
    if (birthCase === 'A' && !ALLOW_ADULT_SIGNUP_IN_DEV) {
      showTooOldForSignupAlert(goToLogin);
      return;
    }
    if (birthCase === 'D') {
      showTooYoungForSignupAlert(goToLogin);
      return;
    }

    applyBirthDateToState(nextBirthDate);

    // 성인 테스트: 과연령(A)은 학생(B)과 동일하게 본인인증으로 진행
    if (birthCase === 'C') {
      setRequiresGuardianVerification(true);
      if (guardianVerified) {
        setShowStudentIdentityIntroModal(true);
        return;
      }
      setGuardianVerified(false);
      setGuardianVerifiedAt(null);
      setShowGuardianConsentModal(true);
      return;
    }

    setRequiresGuardianVerification(false);
    setGuardianVerified(false);
    setGuardianVerifiedAt(null);
    void runStudentIdentityVerification(STEP.BIRTH_DATE);
  };

  const handleGuardianConsentModalDismissed = useCallback(() => {
    const pending = guardianModalPendingActionRef.current;
    guardianModalPendingActionRef.current = null;
    if (!pending || !isMountedRef.current) return;

    InteractionManager.runAfterInteractions(() => {
      if (!isMountedRef.current) return;
      if (pending === 'intro') {
        setShowStudentIdentityIntroModal(true);
        return;
      }
      if (pending === 'verification') {
        void runGuardianAndStudentVerification();
      }
    });
  }, [runGuardianAndStudentVerification]);

  const handleGuardianConsentStart = () => {
    setConsentData((prev) => ({
      ...prev,
      consents: { ...prev.consents, guardian: true },
      allConsented: true,
    }));
    guardianModalPendingActionRef.current = guardianVerified
      ? 'intro'
      : 'verification';
    setShowGuardianConsentModal(false);
  };

  const handleGuardianConsentLater = () => {
    guardianModalPendingActionRef.current = null;
    setShowGuardianConsentModal(false);
    goToLogin();
  };

  const handleAccountNext = () => {
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
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
      }));
      setCurrentStep(STEP.SCHOOL_SELECT);
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
    setFormData((prev) => ({
      ...prev,
      ...stepInfoData,
    }));
    setCurrentStep(STEP.SCHOOL_SELECT);
  };

  const handleSchoolSelectNext = () => {
    if (!selectedSchool?.id || selectedSchool?.manual) {
      Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
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

  const resolveSignupEnrollment = (birthDate, overrides = {}) => {
    const level =
      overrides.level || inferExpectedSchoolLevel(birthDate);
    let enrollment = buildEnrollmentFromBirthDate(birthDate, level);

    const grade =
      overrides.grade ?? enrollment.grade ?? 1;
    const classNum = overrides.classNum ?? 1;
    let graduationYear =
      overrides.graduationYear ?? enrollment.graduationYear;
    let schoolLevel = overrides.level || enrollment.schoolLevel;

    // 성인 테스트 시 학년·졸업년도 자동 추정 실패 → 고3 대체값으로 진행
    if (
      ALLOW_ADULT_SIGNUP_IN_DEV &&
      (!schoolLevel ||
        !Number.isFinite(Number(graduationYear)) ||
        Number(graduationYear) < 1900)
    ) {
      const fallback = getAdultTestEnrollmentFallback();
      schoolLevel = schoolLevel || fallback.schoolLevel;
      graduationYear =
        Number.isFinite(Number(graduationYear)) && Number(graduationYear) >= 1900
          ? Number(graduationYear)
          : fallback.graduationYear;
      return {
        schoolLevel,
        grade: Number.isFinite(Number(grade)) && Number(grade) >= 1
          ? Number(grade)
          : fallback.grade,
        classNum:
          Number.isFinite(Number(classNum)) && Number(classNum) >= 1
            ? Number(classNum)
            : fallback.classNum,
        graduationYear,
      };
    }

    return {
      schoolLevel,
      grade,
      classNum,
      graduationYear,
    };
  };

  const buildStudentVerificationSnapshot = (data) => {
    const resolvedBirthDate = identity.birthDate;
    const enrollment = resolveSignupEnrollment(resolvedBirthDate, {
      level:
        data?.expectedLevel ||
        data?.verification?.expectedLevel ||
        undefined,
      grade:
        data?.verification?.suggestedGrade ??
        data?.grade ??
        undefined,
      classNum:
        data?.verification?.suggestedClassNumber ?? data?.class ?? undefined,
      graduationYear:
        data?.verification?.suggestedGraduationYear ??
        data?.graduationYear ??
        undefined,
    });

    const { schoolLevel, grade, classNum, graduationYear } = enrollment;

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
      schoolLevel,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear:
        graduationYear != null && graduationYear !== ''
          ? String(graduationYear)
          : '',
      schoolId: selectedSchool?.id || formData.schoolId,
      schoolName: selectedSchool?.name || formData.schoolName,
    };

    return { recognized, token, formPatch };
  };

  const handleStudentVerified = (data) => {
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

    if (!token) {
      Alert.alert('알림', '학생증 인증 정보가 없습니다. 다시 제출해 주세요.');
      return;
    }
    if (!identityData.inicisClientToken && !inicisClientTokenRef.current) {
      Alert.alert(
        '본인인증 필요',
        '학생 본인인증 정보가 없습니다. 이전 단계에서 본인인증을 다시 완료해 주세요.',
      );
      return;
    }

    setRecognizedData(recognized);
    setStudentVerificationToken(token);
    setFormData((prev) => ({ ...prev, ...formPatch }));
    setStudentVerified(true);
  };

  const buildSignupPayload = (
    finalData,
    verificationToken = studentVerificationToken,
    verificationData = recognizedData,
    options = {},
  ) => {
    const resolvedBirthDate = normalizeBirthDateForCompare(
      identityData.birthDate || finalData.birthDate || identity.birthDate,
    );
    const enrollment = resolveSignupEnrollment(resolvedBirthDate || identity.birthDate, {
      level: finalData.schoolLevel || undefined,
      grade:
        Number(finalData.grade) ||
        Number(verificationData?.grade) ||
        undefined,
      classNum:
        Number(finalData.classNum) || Number(verificationData?.class) || undefined,
      graduationYear:
        Number(finalData.graduationYear) ||
        Number(verificationData?.graduationYear) ||
        undefined,
    });
    const grade = enrollment.grade;
    const classNumber = enrollment.classNum;
    const graduationYear = enrollment.graduationYear;

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
      birthDate: resolvedBirthDate || identity.birthDate,
      schoolId: finalData.schoolId,
      grade,
      classNumber,
      graduationYear,
      colorId: pickRandomProfileColorId(),
      verificationMethod,
      consents: consentData.consents || {},
    };

    if (options.studentInicisClientToken || identityData.inicisClientToken) {
      payload.studentInicisClientToken =
        options.studentInicisClientToken || identityData.inicisClientToken;
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
      const inicisToken =
        inicisClientTokenRef.current || identityData.inicisClientToken;
      const payload = buildSignupPayload(
        finalData,
        studentVerificationToken,
        recognizedData,
        { studentInicisClientToken: inicisToken },
      );
      if (
        !Number.isFinite(payload.graduationYear) ||
        payload.graduationYear < 1900
      ) {
        Alert.alert(
          '가입 정보 확인',
          '생년월일 기준으로 학년·졸업년도를 자동 계산하지 못했습니다.\n' +
            '중·고등학생 생년월일(만 14~19세)로 다시 시도해 주세요.',
        );
        return;
      }
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
      case STEP.ACCOUNT:
        return '계정 만들기';
      case STEP.SCHOOL_SELECT:
        return '학교 선택';
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

  const handlePrimaryPress = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        handleConsentNext();
        break;
      case STEP.BIRTH_DATE:
        handleBirthDateNext();
        break;
      case STEP.ACCOUNT:
        handleAccountNext();
        break;
      case STEP.SCHOOL_SELECT:
        handleSchoolSelectNext();
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
    if (submitting || inicisOverlayVisible) return true;
    if (SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST) {
      if (currentStep === STEP.SCHOOL_SELECT) {
        if (!selectedSchool?.id || selectedSchool?.manual) return true;
      }
      return false;
    }
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.BIRTH_DATE) {
      if (!birthDate || !isValidBirthDateString(birthDate)) return true;
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
    if (currentStep === STEP.SCHOOL_SELECT) {
      if (!selectedSchool?.id || selectedSchool?.manual) return true;
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
            onBirthDateChange={handleBirthDateChange}
          />
        )}
        {currentStep === STEP.ACCOUNT && (
          <SignStep2
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            verifiedName={identity.name || identityData.name}
            accountOnly
            onChange={setStepInfoData}
          />
        )}
        {currentStep === STEP.SCHOOL_SELECT && (
          <SignStepSchoolSelect
            styles={styles}
            normalize={normalize}
            selectedSchool={selectedSchool}
            onSelect={setSelectedSchool}
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
            normalize={normalize}
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
        onDismissed={handleGuardianConsentModalDismissed}
      />

      <SignupStudentIdentityIntroModal
        visible={showStudentIdentityIntroModal}
        normalize={normalize}
        onStart={handleStudentIdentityIntroStart}
        onCancel={handleStudentIdentityIntroCancel}
      />

      <SignupIdentityVerifyingOverlay
        visible={inicisOverlayVisible}
        title={inicisOverlayTitle}
        normalize={normalize}
        onOpenManually={handleInicisOverlayOpenManually}
        onCancel={handleInicisOverlayCancel}
        openingManually={inicisManualOpening}
      />

      <SignupBlockingAlertModal
        visible={blockingAlert.visible}
        title={blockingAlert.title}
        message={blockingAlert.message}
        buttons={blockingAlert.buttons}
        normalize={normalize}
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
