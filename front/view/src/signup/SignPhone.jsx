import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import SignStepGuardianConsentModal from './SignStepGuardianConsentModal';
import SignupStudentIdentityIntroModal from './SignupStudentIdentityIntroModal';
import SignupIdentityVerifyingOverlay from './SignupIdentityVerifyingOverlay';
import SignupBlockingAlertModal from './SignupBlockingAlertModal';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SignStepBirthDateCalendar from './SignStepBirthDateCalendar';
import SignStep2 from './SignStep2';
import SignStepSchoolSelect from './SignStepSchoolSelect';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import SignStepAltVerifyChoice from './SignStepAltVerifyChoice';
import SignStepNeisPlusSubmit from './SignStepNeisPlusSubmit';
import SignStepCertificateGuide from './SignStepCertificateGuide';
import SignStepCertificate from './SignStepCertificate';
import Skeleton from '../../../components/common/Skeleton';
import { api, setAuthToken } from '../../../utils/api';
import { peekPendingInviteCode, consumePendingInviteCode } from '../../../utils/inviteReferral';
import {
  clearPendingInicisSession,
  cancelInicisFlow,
  getPendingInicisSession,
  resumePendingInicisFlow,
  runInicisIdentityFlow,
  fetchInicisServerEnabled,
  isInicisClientEnabled,
  openPendingInicisBrowser,
  dismissInicisBrowserSafely,
  waitForPresentationLayerRelease,
} from '../../../services/inicisAuth';
import { useAuth } from '../../../context/AuthContext';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import {
  showTooOldForSignupAlert,
  showTooYoungForSignupAlert,
  GRADE_MISMATCH_HELP_TITLE,
  GRADE_MISMATCH_HELP_MESSAGE,
} from './authFeatureAlerts';
import {
  classifyBirthDateCase,
  isValidBirthDateString,
  normalizeBirthDateForCompare,
  birthDatesMatch,
} from './signupBirthDatePolicy';
import {
  buildEnrollmentFromBirthDate,
  pickRandomProfileColorId,
} from './signupEnrollmentUtils';
import { SIGNUP_REDESIGN_SKIP_VALIDATION } from './signupRedesignFlags';
import {
  isValidUsername,
  isValidPassword,
  USERNAME_ERROR,
  PASSWORD_ERROR,
} from '../../../utils/signupValidation';
import {
  clearSignupPendingSession,
  getSignupPendingSession,
  saveSignupPendingSession,
} from './signupSessionStorage';

const STEP = {
  BIRTH_DATE: 'birth_date',
  ACCOUNT: 'account',
  SCHOOL_SELECT: 'school_select',
  STUDENT_VERIFY: 'student_verify',
  ALT_VERIFY_CHOICE: 'alt_verify_choice',
  CERTIFICATE_GUIDE: 'certificate_guide',
  CERTIFICATE_SUBMIT: 'certificate_submit',
  NEIS_PLUS_SUBMIT: 'neis_plus_submit',
};

const SIGNUP_TEST_MOCK_ACCOUNT = {
  username: 'phone_testuser',
  password: 'Test1234',
  passwordConfirm: 'Test1234',
};

const MOCK_STUDENT_TOKEN = 'redesign-skip-student-token';
const INICIS_MOCK_PHONE = '01000000000';

const OCR_TEST_MOCK_IDENTITY = {
  name: '테스트학생',
  birthDate: '2010-05-15',
  phoneNumber: INICIS_MOCK_PHONE,
};

const INICIS_OVERLAY_TITLE = {
  GUARDIAN: '보호자 본인인증 진행 중',
  STUDENT: '본인인증 진행 중',
};

const SignPhone = ({ navigation }) => {
  const route = useRoute();
  const { login } = useAuth();
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = createSignupStyles(width, normalize);

  const [currentStep, setCurrentStep] = useState(STEP.BIRTH_DATE);
  const [stepInfoData, setStepInfoData] = useState({});
  const [consentData, setConsentData] = useState(
    () => route.params?.consents || { allConsented: false, consents: {} },
  );
  const [identityData, setIdentityData] = useState({});
  const [formData, setFormData] = useState({});
  const [birthDate, setBirthDate] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolClassNum, setSchoolClassNum] = useState('');
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentVerificationToken, setStudentVerificationToken] = useState(null);
  const [recognizedData, setRecognizedData] = useState(null);
  const [certificateData, setCertificateData] = useState({
    certificateUrl: '',
    accessNumber: '',
  });
  const [guardianVerified, setGuardianVerified] = useState(false);
  const [guardianVerifiedAt, setGuardianVerifiedAt] = useState(null);
  const [guardianInicisClientToken, setGuardianInicisClientToken] = useState(null);
  const [requiresGuardianVerification, setRequiresGuardianVerification] =
    useState(false);
  const [showGuardianConsentModal, setShowGuardianConsentModal] = useState(false);
  const [showStudentIdentityIntroModal, setShowStudentIdentityIntroModal] =
    useState(false);
  const [inicisOverlayVisible, setInicisOverlayVisible] = useState(false);
  const [inicisOverlayTitle, setInicisOverlayTitle] = useState(
    INICIS_OVERLAY_TITLE.STUDENT,
  );
  const [inicisManualOpening, setInicisManualOpening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);
  const [blockingAlert, setBlockingAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: '확인', onPress: () => {} }],
  });

  const isMountedRef = useRef(true);
  const sessionHydratedRef = useRef(false);
  const birthDateInputRef = useRef('');
  const inicisClientTokenRef = useRef(null);
  const inicisFlowActiveRef = useRef(false);
  const inicisResumeStepRef = useRef(STEP.BIRTH_DATE);
  const guardianModalPendingActionRef = useRef(null);

  const identity = useMemo(
    () => ({
      name: identityData.name || formData.name || '',
      birthDate:
        normalizeBirthDateForCompare(birthDate) ||
        normalizeBirthDateForCompare(identityData.birthDate) ||
        identityData.birthDate ||
        formData.birthDate ||
        '',
      phoneNumber: identityData.phoneNumber || formData.phoneNumber || '',
    }),
    [birthDate, formData, identityData],
  );

  const schoolEnrollmentPreview = useMemo(() => {
    const bd = identity.birthDate;
    if (!bd || !isValidBirthDateString(bd)) {
      return { grade: null, graduationYear: null, schoolLevel: null };
    }
    return buildEnrollmentFromBirthDate(bd);
  }, [identity.birthDate]);

  const schoolGradeLabel = useMemo(() => {
    const g = schoolEnrollmentPreview.grade;
    if (g == null || !Number.isFinite(Number(g))) return '';
    return `${Number(g)}학년`;
  }, [schoolEnrollmentPreview.grade]);

  const progressWidth = useMemo(() => {
    const map = {
      [STEP.BIRTH_DATE]: 15,
      [STEP.ACCOUNT]: 30,
      [STEP.SCHOOL_SELECT]: 55,
      [STEP.STUDENT_VERIFY]: studentVerified ? 92 : 75,
      [STEP.ALT_VERIFY_CHOICE]: 78,
      [STEP.CERTIFICATE_GUIDE]: 80,
      [STEP.NEIS_PLUS_SUBMIT]: 84,
      [STEP.CERTIFICATE_SUBMIT]: 88,
    };
    return map[currentStep] || 15;
  }, [currentStep, studentVerified]);

  const buildSessionSnapshot = useCallback(
    () => ({
      currentStep,
      consentData,
      identityData,
      formData,
      birthDate,
      stepInfoData,
      selectedSchool,
      schoolClassNum,
      studentVerified,
      studentVerificationToken,
      recognizedData,
      guardianVerified,
      guardianVerifiedAt,
      guardianInicisClientToken,
      requiresGuardianVerification,
      certificateData,
    }),
    [
      birthDate,
      certificateData,
      consentData,
      currentStep,
      formData,
      guardianInicisClientToken,
      guardianVerified,
      guardianVerifiedAt,
      identityData,
      recognizedData,
      requiresGuardianVerification,
      schoolClassNum,
      stepInfoData,
      selectedSchool,
      studentVerificationToken,
      studentVerified,
    ],
  );

  const persistSession = useCallback(async () => {
    if (!sessionHydratedRef.current) return;
    await saveSignupPendingSession('phone', buildSessionSnapshot());
  }, [buildSessionSnapshot]);

  const applySessionSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    if (snapshot.consentData) setConsentData(snapshot.consentData);
    if (snapshot.identityData) setIdentityData(snapshot.identityData);
    if (snapshot.formData) setFormData(snapshot.formData);
    if (snapshot.birthDate) {
      setBirthDate(snapshot.birthDate);
      birthDateInputRef.current = snapshot.birthDate;
    }
    if (snapshot.selectedSchool) setSelectedSchool(snapshot.selectedSchool);
    if (snapshot.schoolClassNum != null) setSchoolClassNum(snapshot.schoolClassNum);
    if (snapshot.studentVerified != null) setStudentVerified(snapshot.studentVerified);
    if (snapshot.studentVerificationToken) {
      setStudentVerificationToken(snapshot.studentVerificationToken);
    }
    if (snapshot.recognizedData) setRecognizedData(snapshot.recognizedData);
    if (snapshot.guardianVerified != null) setGuardianVerified(snapshot.guardianVerified);
    if (snapshot.guardianVerifiedAt) setGuardianVerifiedAt(snapshot.guardianVerifiedAt);
    if (snapshot.guardianInicisClientToken) {
      setGuardianInicisClientToken(snapshot.guardianInicisClientToken);
    }
    if (snapshot.requiresGuardianVerification != null) {
      setRequiresGuardianVerification(snapshot.requiresGuardianVerification);
    }
    if (snapshot.certificateData) setCertificateData(snapshot.certificateData);
    if (snapshot.stepInfoData) setStepInfoData(snapshot.stepInfoData);
    if (snapshot.currentStep) setCurrentStep(snapshot.currentStep);
  }, []);

  const clearFlowSession = useCallback(async () => {
    await clearSignupPendingSession('phone');
    await clearPendingInicisSession();
    cancelInicisFlow();
  }, []);

  const goToLogin = useCallback(() => {
    resetTo('Login');
  }, [resetTo]);

  const closeBlockingAlert = useCallback(() => {
    setBlockingAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const proceedToAccount = useCallback(() => {
    setCurrentStep(STEP.ACCOUNT);
  }, []);

  const applyBirthDateToState = useCallback((nextBirthDate) => {
    birthDateInputRef.current = nextBirthDate;
    setBirthDate(nextBirthDate);
    setFormData((prev) => ({ ...prev, birthDate: nextBirthDate }));
    setIdentityData((prev) => ({ ...prev, birthDate: nextBirthDate }));
  }, []);

  const advanceToAccountAfterIdentity = useCallback(
    (overrideIdentity = {}) => {
      const merged = { ...identityData, ...overrideIdentity };
      const name = merged.name?.trim() || identityData.name || '';
      const phoneNumber = merged.phoneNumber || identityData.phoneNumber || '';
      const resolvedBirthDate =
        merged.birthDate || birthDate || formData.birthDate || '';

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
        isVerified: merged.isVerified ?? true,
        inicisClientToken: merged.inicisClientToken ?? prev.inicisClientToken,
      }));
      if (resolvedBirthDate) {
        applyBirthDateToState(resolvedBirthDate);
      }
      proceedToAccount();
    },
    [
      applyBirthDateToState,
      birthDate,
      formData.birthDate,
      guardianVerifiedAt,
      identityData,
      proceedToAccount,
      requiresGuardianVerification,
    ],
  );

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
            : [{ text: '확인', onPress: closeBlockingAlert }];
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

  const showGuardianIncompleteAfterOverlay = useCallback(
    (message) => {
      showInicisAlertAfterOverlay(
        '보호자 인증 미완료',
        message ||
          '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
      );
    },
    [showInicisAlertAfterOverlay],
  );

  const showStudentVerifyErrorAfterOverlay = useCallback(
    (error) => {
      if (error?.code === 'CANCELLED') return;
      showInicisAlertAfterOverlay(
        '본인인증 오류',
        error?.message || '본인인증 중 오류가 발생했습니다.',
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
      showGuardianIncompleteAfterOverlay(
        error?.message ||
          '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
      );
    },
    [showGuardianIncompleteAfterOverlay, showInicisAlertAfterOverlay],
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
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      return {
        ok: true,
        nextIdentity: {
          ...OCR_TEST_MOCK_IDENTITY,
          name: identityData.name || OCR_TEST_MOCK_IDENTITY.name,
          birthDate:
            birthDateInputRef.current ||
            birthDate ||
            OCR_TEST_MOCK_IDENTITY.birthDate,
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
          name: identityData.name || OCR_TEST_MOCK_IDENTITY.name,
          phoneNumber: INICIS_MOCK_PHONE,
          birthDate:
            birthDateInputRef.current ||
            birthDate ||
            OCR_TEST_MOCK_IDENTITY.birthDate,
          isVerified: true,
        },
      };
    }

    const result = await executeInicisFlow('student_signup');
    if (!result) return null;
    return evaluateStudentVerifyResult(result);
  }, [birthDate, evaluateStudentVerifyResult, executeInicisFlow, identityData.name]);

  const runGuardianIdentityVerificationCore = useCallback(async () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
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

  const commitStudentVerifySuccess = useCallback(
    (evaluation) => {
      if (!evaluation?.ok) return;
      advanceToAccountAfterIdentity(evaluation.nextIdentity);
    },
    [advanceToAccountAfterIdentity],
  );

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

  const resumeInicisFromPending = useCallback(async () => {
    if (inicisFlowActiveRef.current || SIGNUP_REDESIGN_SKIP_VALIDATION) return;
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

  const handleBirthDateChange = useCallback(
    (nextBirthDate) => {
      setBirthDate(nextBirthDate);
      birthDateInputRef.current = nextBirthDate;
      setFormData((prev) => ({ ...prev, birthDate: nextBirthDate }));
      setIdentityData((prev) => ({ ...prev, birthDate: nextBirthDate }));
    },
    [],
  );

  const handleBirthDateNext = () => {
    const nextBirthDate = SIGNUP_REDESIGN_SKIP_VALIDATION
      ? birthDate || OCR_TEST_MOCK_IDENTITY.birthDate
      : birthDate;

    if (!SIGNUP_REDESIGN_SKIP_VALIDATION) {
      if (!isValidBirthDateString(nextBirthDate)) {
        Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
        return;
      }
    } else {
      applyBirthDateToState(nextBirthDate);
      setRequiresGuardianVerification(false);
      setGuardianVerified(false);
      setGuardianVerifiedAt(null);
      advanceToAccountAfterIdentity({
        ...OCR_TEST_MOCK_IDENTITY,
        name: identityData.name || OCR_TEST_MOCK_IDENTITY.name,
        birthDate: nextBirthDate,
        isVerified: true,
      });
      return;
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
      if (SIGNUP_REDESIGN_SKIP_VALIDATION && pending === 'verification') {
        setGuardianInicisClientToken('test-guardian-token');
        setGuardianVerified(true);
        proceedToAccount();
        return;
      }
      if (pending === 'intro') {
        setShowStudentIdentityIntroModal(true);
        return;
      }
      if (pending === 'verification') {
        void runGuardianAndStudentVerification();
      }
    });
  }, [proceedToAccount, runGuardianAndStudentVerification]);

  const handleGuardianConsentStart = () => {
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

  const handleStudentIdentityIntroStart = () => {
    setShowStudentIdentityIntroModal(false);
    InteractionManager.runAfterInteractions(() => {
      void runStudentIdentityVerification(STEP.BIRTH_DATE);
    });
  };

  const handleStudentIdentityIntroCancel = () => {
    setShowStudentIdentityIntroModal(false);
  };

  const handleAccountNext = () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
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

  const proceedFromSchoolSelect = useCallback(() => {
    const grade = schoolEnrollmentPreview.grade;
    const classNum = Number(schoolClassNum);
    setFormData((prev) => ({
      ...prev,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear: String(schoolEnrollmentPreview.graduationYear || ''),
      schoolLevel: schoolEnrollmentPreview.schoolLevel || prev.schoolLevel,
    }));
    setCurrentStep(STEP.STUDENT_VERIFY);
  }, [schoolClassNum, schoolEnrollmentPreview, selectedSchool]);

  const handleSchoolSelectNext = () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      const grade = schoolEnrollmentPreview.grade || 2;
      const classNum = Number(schoolClassNum) || 1;
      setFormData((prev) => ({
        ...prev,
        schoolId: selectedSchool?.id || prev.schoolId || 'REDESIGN_SKIP',
        schoolName: selectedSchool?.name || prev.schoolName || '개편테스트학교',
        grade: String(grade),
        classNum: String(classNum),
        graduationYear: String(
          schoolEnrollmentPreview.graduationYear ||
            new Date().getFullYear() + 2,
        ),
        schoolLevel: schoolEnrollmentPreview.schoolLevel || 'high',
      }));
      setCurrentStep(STEP.STUDENT_VERIFY);
      return;
    }

    if (!selectedSchool?.id || selectedSchool?.manual) {
      Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
      return;
    }
    const grade = schoolEnrollmentPreview.grade;
    if (grade == null || !Number.isFinite(Number(grade)) || Number(grade) < 1) {
      Alert.alert('알림', '생년월일 기준으로 학년을 계산하지 못했습니다.');
      return;
    }
    const classNum = Number(schoolClassNum);
    if (!Number.isFinite(classNum) || classNum < 1) {
      Alert.alert('알림', '반을 입력해 주세요.');
      return;
    }

    setBlockingAlert({
      visible: true,
      title: '학적 정보 확인',
      message: `${selectedSchool.name} ${Number(grade)}학년 ${classNum}반이 맞나요?`,
      buttons: [
        {
          text: '맞아요',
          onPress: () => {
            closeBlockingAlert();
            proceedFromSchoolSelect();
          },
        },
        { text: '수정하기', variant: 'secondary', onPress: closeBlockingAlert },
      ],
    });
  };

  const handleStudentVerified = (data) => {
    const token =
      data?.studentVerificationToken ||
      data?.verification?.studentVerificationToken ||
      MOCK_STUDENT_TOKEN;

    setRecognizedData(data);
    setStudentVerificationToken(token);
    setStudentVerified(true);
    setFormData((prev) => ({
      ...prev,
      schoolId: selectedSchool?.id || prev.schoolId,
      schoolName: selectedSchool?.name || prev.schoolName,
      grade: String(schoolEnrollmentPreview.grade || prev.grade || 2),
      classNum: String(schoolClassNum || prev.classNum || 1),
      graduationYear: String(
        schoolEnrollmentPreview.graduationYear || prev.graduationYear || '',
      ),
    }));
  };

  const buildSignupPayload = (finalData, verificationToken) => {
    const resolvedBirthDate =
      normalizeBirthDateForCompare(identity.birthDate) || identity.birthDate;
    const enrollment = buildEnrollmentFromBirthDate(resolvedBirthDate);

    return {
      username: finalData.username || SIGNUP_TEST_MOCK_ACCOUNT.username,
      password: finalData.password || SIGNUP_TEST_MOCK_ACCOUNT.password,
      name: (identity.name || '').trim(),
      phone: String(identity.phoneNumber || '').replace(/\D/g, ''),
      birthDate: resolvedBirthDate,
      schoolId: finalData.schoolId,
      grade: Number(finalData.grade) || enrollment.grade || 1,
      classNumber: Number(finalData.classNum) || 1,
      graduationYear:
        Number(finalData.graduationYear) || enrollment.graduationYear,
      colorId: pickRandomProfileColorId(),
      verificationMethod: 'student_id',
      consents: consentData.consents || {},
      studentVerificationToken: verificationToken,
      studentInicisClientToken:
        identityData.inicisClientToken || inicisClientTokenRef.current || null,
      guardianInicisClientToken: guardianInicisClientToken || null,
    };
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
    const verificationToken = studentVerificationToken || MOCK_STUDENT_TOKEN;

    setSubmitting(true);
    try {
      const payload = buildSignupPayload(finalData, verificationToken);
      payload.inviteCode = await peekPendingInviteCode();
      await api.post('/api/auth/signup', payload);
      await consumePendingInviteCode();
      await clearFlowSession();
      await finishSignupAndEnterApp(payload.username, payload.password);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = async () => {
    if (submitting) return;

    if (currentStep === STEP.BIRTH_DATE) {
      await clearFlowSession();
      navigation.navigate('SignupEntry');
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
      setCurrentStep(STEP.SCHOOL_SELECT);
      return;
    }
    if (currentStep === STEP.ALT_VERIFY_CHOICE) {
      setCurrentStep(STEP.STUDENT_VERIFY);
      return;
    }
    if (currentStep === STEP.CERTIFICATE_GUIDE) {
      setCurrentStep(STEP.ALT_VERIFY_CHOICE);
      return;
    }
    if (currentStep === STEP.CERTIFICATE_SUBMIT) {
      setCurrentStep(STEP.CERTIFICATE_GUIDE);
      return;
    }
    if (currentStep === STEP.NEIS_PLUS_SUBMIT) {
      setCurrentStep(STEP.ALT_VERIFY_CHOICE);
      return;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.BIRTH_DATE:
        return '생년월일 입력';
      case STEP.ACCOUNT:
        return '계정 만들기';
      case STEP.SCHOOL_SELECT:
        return '재학 정보 입력';
      case STEP.STUDENT_VERIFY:
        return studentVerified ? '가입 마무리' : '학생증 인증';
      case STEP.ALT_VERIFY_CHOICE:
        return '인증 방법 선택';
      case STEP.CERTIFICATE_GUIDE:
        return '재학증명서 가이드';
      case STEP.CERTIFICATE_SUBMIT:
        return '재학증명서 제출';
      case STEP.NEIS_PLUS_SUBMIT:
        return '나이스+ 제출';
      default:
        return '회원가입';
    }
  };

  const handlePrimaryPress = () => {
    if (currentStep === STEP.BIRTH_DATE) {
      handleBirthDateNext();
      return;
    }
    if (currentStep === STEP.ACCOUNT) {
      handleAccountNext();
      return;
    }
    if (currentStep === STEP.SCHOOL_SELECT) {
      handleSchoolSelectNext();
      return;
    }
    if (currentStep === STEP.STUDENT_VERIFY) {
      if (SIGNUP_REDESIGN_SKIP_VALIDATION && !studentVerified) {
        handleStudentVerified({ studentVerificationToken: MOCK_STUDENT_TOKEN });
      } else if (studentVerified) {
        void handleComplete();
      }
    }
  };

  const isPrimaryDisabled = () => {
    if (submitting) return true;
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      if (currentStep === STEP.BIRTH_DATE) return false;
      if (currentStep === STEP.ACCOUNT) return false;
      if (currentStep === STEP.STUDENT_VERIFY) return false;
      return false;
    }
    if (currentStep === STEP.BIRTH_DATE) {
      return !isValidBirthDateString(birthDate);
    }
    if (currentStep === STEP.ACCOUNT) {
      if (
        !stepInfoData.username ||
        !stepInfoData.password ||
        !stepInfoData.passwordConfirm
      ) {
        return true;
      }
      if (!isValidUsername(stepInfoData.username)) return true;
      if (!isValidPassword(stepInfoData.password)) return true;
      if (stepInfoData.password !== stepInfoData.passwordConfirm) return true;
      return false;
    }
    if (currentStep === STEP.SCHOOL_SELECT) {
      if (!selectedSchool?.id || selectedSchool?.manual) return true;
      if (!Number(schoolClassNum) || Number(schoolClassNum) < 1) return true;
    }
    if (currentStep === STEP.STUDENT_VERIFY && !studentVerified) return true;
    return false;
  };

  const primaryLabel = () => {
    if (
      SIGNUP_REDESIGN_SKIP_VALIDATION &&
      currentStep === STEP.STUDENT_VERIFY &&
      !studentVerified
    ) {
      return '테스트 인증 완료';
    }
    if (currentStep === STEP.STUDENT_VERIFY && studentVerified) return '제출하기';
    return '다음 단계';
  };

  const showPrimaryFooter = [
    STEP.BIRTH_DATE,
    STEP.ACCOUNT,
    STEP.SCHOOL_SELECT,
    STEP.STUDENT_VERIFY,
  ].includes(currentStep);

  const hideFooterForOverlay =
    showGuardianConsentModal ||
    showStudentIdentityIntroModal ||
    inicisOverlayVisible ||
    blockingAlert.visible;

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => setScreenReady(true), 200);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      cancelInicisFlow();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (route.params?.resumeSession) {
        const pending = await getSignupPendingSession();
        if (!cancelled && pending?.provider === 'phone') {
          applySessionSnapshot(pending.snapshot);
          if (!cancelled) {
            await resumeInicisFromPending();
          }
        }
      } else if (route.params?.consents) {
        setConsentData(route.params.consents);
        setCurrentStep(STEP.BIRTH_DATE);
      }

      if (!cancelled) {
        sessionHydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applySessionSnapshot,
    resumeInicisFromPending,
    route.params?.consents,
    route.params?.resumeSession,
  ]);

  useEffect(() => {
    void persistSession();
  }, [persistSession]);

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => void handleBack()}
              disabled={submitting}
            >
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
        {currentStep === STEP.BIRTH_DATE && (
          <SignStepBirthDateCalendar
            normalize={normalize}
            initialBirthDate={birthDate}
            onBirthDateChange={handleBirthDateChange}
            bottomOffset={footerHeight}
          />
        )}

        {currentStep === STEP.ACCOUNT && (
          <SignStep2
            styles={styles}
            normalize={normalize}
            bottomOffset={footerHeight}
            verifiedName={identity.name || identityData.name}
            verifiedBirthDate={identity.birthDate}
            verifiedPhone={identity.phoneNumber}
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
            gradeLabel={schoolGradeLabel}
            classNum={schoolClassNum}
            onClassNumChange={setSchoolClassNum}
            onPressGradeMismatch={() => {
              setBlockingAlert({
                visible: true,
                title: GRADE_MISMATCH_HELP_TITLE,
                message: GRADE_MISMATCH_HELP_MESSAGE,
                buttons: [{ text: '확인', onPress: closeBlockingAlert }],
              });
            }}
            bottomOffset={footerHeight}
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
            onCertificateGuide={() => setCurrentStep(STEP.ALT_VERIFY_CHOICE)}
          />
        )}

        {currentStep === STEP.ALT_VERIFY_CHOICE && (
          <SignStepAltVerifyChoice
            normalize={normalize}
            onSelectNeisPlus={() => setCurrentStep(STEP.NEIS_PLUS_SUBMIT)}
            onSelectCertificate={() => setCurrentStep(STEP.CERTIFICATE_GUIDE)}
          />
        )}

        {currentStep === STEP.CERTIFICATE_GUIDE && (
          <SignStepCertificateGuide
            styles={styles}
            onProceed={() => setCurrentStep(STEP.CERTIFICATE_SUBMIT)}
            testMode={SIGNUP_REDESIGN_SKIP_VALIDATION}
          />
        )}

        {currentStep === STEP.CERTIFICATE_SUBMIT && (
          <SignStepCertificate
            styles={styles}
            normalize={normalize}
            certificateData={certificateData}
            onChange={setCertificateData}
            bottomOffset={footerHeight}
          />
        )}

        {currentStep === STEP.NEIS_PLUS_SUBMIT && (
          <SignStepNeisPlusSubmit
            mode="signup"
            identity={identity}
            selectedSchool={selectedSchool}
            onVerified={handleStudentVerified}
            onBack={() => setCurrentStep(STEP.ALT_VERIFY_CHOICE)}
          />
        )}
      </View>

      {showPrimaryFooter && !hideFooterForOverlay ? (
        <View
          style={styles.footerSection}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isPrimaryDisabled() && styles.primaryButtonDisabled,
            ]}
            onPress={handlePrimaryPress}
            disabled={isPrimaryDisabled()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel()}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
        onRequestClose={closeBlockingAlert}
      />

      <SubmittingLockModal visible={submitting} message="가입 처리 중…" />
    </SafeAreaView>
  );
};

export default SignPhone;
