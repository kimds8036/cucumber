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
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepGuardianConsentModal from './SignStepGuardianConsentModal';
import SignupBlockingAlertModal from './SignupBlockingAlertModal';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SignStepSchoolSelect from './SignStepSchoolSelect';
import usePreventSignupStackExit from './usePreventSignupStackExit';
import {
  buildAbortSignupConfirmAlert,
  leaveSignupToEntry,
} from './signupAbort';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import SignStepAltVerifyChoice from './SignStepAltVerifyChoice';
import SignStepNeisPlusSubmit from './SignStepNeisPlusSubmit';
import SignStepCertificateGuide from './SignStepCertificateGuide';
import SignStepCertificate from './SignStepCertificate';
import SignupPrimaryFooter from './SignupPrimaryFooter';
import Skeleton from '../../../components/common/Skeleton';
import { api, setAuthToken, setRefreshToken, getOrCreateDeviceId } from '../../../utils/api';
import {
  peekPendingInviteCode,
  consumePendingInviteCode,
} from '../../../utils/inviteReferral';
import {
  clearPendingInicisSession,
  cancelInicisFlow,
  getPendingInicisSession,
  resumePendingInicisFlow,
  runInicisIdentityFlow,
  fetchInicisServerEnabled,
  isInicisClientEnabled,
} from '../../../services/inicisAuth';
import { useAuth } from '../../../context/AuthContext';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import {
  showTooYoungForSignupAlert,
} from './authFeatureAlerts';
import {
  classifyBirthDateCase,
  isValidBirthDateString,
  normalizeBirthDateForCompare,
} from './signupBirthDatePolicy';
import {
  buildEnrollmentFromBirthDate,
  pickRandomProfileColorId,
} from './signupEnrollmentUtils';
import { SIGNUP_REDESIGN_SKIP_VALIDATION } from './signupRedesignFlags';
import {
  alertSignupDuplicateAndOfferLogin,
  assertPhoneAvailableForSignup,
} from './signupDuplicateGuard';
import {
  loginWithKakao,
  mapKakaoProfileToIdentity,
} from '../../../services/kakaoAuth';
import {
  clearSignupPendingSession,
  getSignupPendingSession,
  saveSignupPendingSession,
} from './signupSessionStorage';

const STEP = {
  KAKAO_AUTH: 'kakao_auth',
  SCHOOL_SELECT: 'school_select',
  STUDENT_VERIFY: 'student_verify',
  ALT_VERIFY_CHOICE: 'alt_verify_choice',
  CERTIFICATE_GUIDE: 'certificate_guide',
  CERTIFICATE_SUBMIT: 'certificate_submit',
  NEIS_PLUS_SUBMIT: 'neis_plus_submit',
};

const MOCK_STUDENT_TOKEN = 'redesign-skip-student-token';

const SignKakao = ({ navigation }) => {
  const route = useRoute();
  const nav = useNavigation();
  const navigationRef = navigation || nav;
  usePreventSignupStackExit(navigationRef);
  const { login } = useAuth();
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = createSignupStyles(width, normalize);

  const [currentStep, setCurrentStep] = useState(STEP.KAKAO_AUTH);
  const [consentData, setConsentData] = useState(
    () => route.params?.consents || { allConsented: false, consents: {} },
  );
  const [identityData, setIdentityData] = useState({});
  const [formData, setFormData] = useState({});
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolClassNum, setSchoolClassNum] = useState('');
  const [schoolGradeNum, setSchoolGradeNum] = useState('');
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentVerificationToken, setStudentVerificationToken] =
    useState(null);
  const [recognizedData, setRecognizedData] = useState(null);
  const [certificateData, setCertificateData] = useState({
    certificateUrl: '',
    accessNumber: '',
  });
  const [guardianInicisClientToken, setGuardianInicisClientToken] =
    useState(null);
  const [showGuardianConsentModal, setShowGuardianConsentModal] =
    useState(false);
  /** 보호자 모달 「나중에」— 로그인으로 보내지 않고 가입 화면에 남아 재시도 */
  const [awaitingGuardianConsent, setAwaitingGuardianConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [kakaoAuthError, setKakaoAuthError] = useState('');
  const [blockingAlert, setBlockingAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: '확인', onPress: () => {} }],
  });

  const isMountedRef = useRef(true);
  const sessionHydratedRef = useRef(false);
  const kakaoAuthRanRef = useRef(false);
  const guardianModalPendingActionRef = useRef(null);
  const completeSignupRef = useRef(null);

  const identity = useMemo(
    () => ({
      name: identityData.name || formData.name || '',
      birthDate:
        normalizeBirthDateForCompare(identityData.birthDate) ||
        identityData.birthDate ||
        formData.birthDate ||
        '',
      phoneNumber: identityData.phoneNumber || formData.phoneNumber || '',
    }),
    [formData, identityData],
  );

  const schoolEnrollmentPreview = useMemo(() => {
    const bd = identity.birthDate;
    if (!bd || !isValidBirthDateString(bd)) {
      return { grade: null, graduationYear: null, schoolLevel: null };
    }
    return buildEnrollmentFromBirthDate(bd);
  }, [identity.birthDate]);

  useEffect(() => {
    const g = schoolEnrollmentPreview.grade;
    if (g == null || !Number.isFinite(Number(g))) return;
    setSchoolGradeNum((prev) => prev || String(Number(g)));
  }, [schoolEnrollmentPreview.grade]);

  const progressWidth = useMemo(() => {
    const total = 3;
    const map = {
      [STEP.KAKAO_AUTH]: 0,
      [STEP.SCHOOL_SELECT]: (1 / total) * 100,
      [STEP.STUDENT_VERIFY]: studentVerified
        ? (3 / total) * 100
        : (2 / total) * 100,
      [STEP.ALT_VERIFY_CHOICE]: (2 / total) * 100,
      [STEP.CERTIFICATE_GUIDE]: (3 / total) * 100,
      [STEP.CERTIFICATE_SUBMIT]: (3 / total) * 100,
      [STEP.NEIS_PLUS_SUBMIT]: (3 / total) * 100,
    };
    return map[currentStep] ?? 0;
  }, [currentStep, studentVerified]);

  const buildSessionSnapshot = useCallback(
    () => ({
      currentStep,
      consentData,
      identityData,
      formData,
      selectedSchool,
      schoolClassNum,
      schoolGradeNum,
      studentVerified,
      studentVerificationToken,
      recognizedData,
      guardianInicisClientToken,
      certificateData,
    }),
    [
      certificateData,
      consentData,
      currentStep,
      formData,
      guardianInicisClientToken,
      identityData,
      recognizedData,
      schoolClassNum,
      schoolGradeNum,
      selectedSchool,
      studentVerificationToken,
      studentVerified,
    ],
  );

  const persistSession = useCallback(async () => {
    if (!sessionHydratedRef.current) return;
    await saveSignupPendingSession('kakao', buildSessionSnapshot());
  }, [buildSessionSnapshot]);

  const applySessionSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    if (snapshot.consentData) setConsentData(snapshot.consentData);
    if (snapshot.identityData) setIdentityData(snapshot.identityData);
    if (snapshot.formData) setFormData(snapshot.formData);
    if (snapshot.selectedSchool) setSelectedSchool(snapshot.selectedSchool);
    if (snapshot.schoolClassNum != null)
      setSchoolClassNum(snapshot.schoolClassNum);
    if (snapshot.schoolGradeNum != null)
      setSchoolGradeNum(snapshot.schoolGradeNum);
    if (snapshot.studentVerified != null)
      setStudentVerified(snapshot.studentVerified);
    if (snapshot.studentVerificationToken) {
      setStudentVerificationToken(snapshot.studentVerificationToken);
    }
    if (snapshot.recognizedData) setRecognizedData(snapshot.recognizedData);
    if (snapshot.guardianInicisClientToken) {
      setGuardianInicisClientToken(snapshot.guardianInicisClientToken);
    }
    if (snapshot.certificateData) setCertificateData(snapshot.certificateData);
    if (snapshot.currentStep) {
      // 레거시 세션에 school_select/account가 남아 있으면 카카오 인증 단계로
      // (STEP.CONSENT는 SignKakao에 없음 — undefined step 방지)
      const step =
        snapshot.currentStep === STEP.SCHOOL_SELECT ||
        snapshot.currentStep === 'account'
          ? STEP.KAKAO_AUTH
          : snapshot.currentStep;
      setCurrentStep(step);
    }
  }, []);

  const clearFlowSession = useCallback(async () => {
    await clearSignupPendingSession('kakao');
    await clearPendingInicisSession();
    cancelInicisFlow();
  }, []);

  const abortSignupImmediate = useCallback(async () => {
    await leaveSignupToEntry({
      navigation: navigationRef,
      clearFlowSession,
      prepareLeave: async () => {
        setBlockingAlert((prev) => ({ ...prev, visible: false }));
        setSubmitting(false);
        setShowGuardianConsentModal(false);
        setAwaitingGuardianConsent(false);
      },
    });
  }, [clearFlowSession, navigationRef]);

  const goToLogin = useCallback(() => {
    resetTo('Login');
  }, [resetTo]);

  const closeBlockingAlert = useCallback(() => {
    setBlockingAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const requestAbortSignup = useCallback(() => {
    if (submitting) return;
    setBlockingAlert(
      buildAbortSignupConfirmAlert({
        onKeepGoing: closeBlockingAlert,
        onConfirm: async () => {
          closeBlockingAlert();
          await abortSignupImmediate();
        },
      }),
    );
  }, [abortSignupImmediate, closeBlockingAlert, submitting]);

  const proceedToSchool = useCallback(() => {
    // 재학정보 화면 스킵 → 바로 가입 완료 (가입_개편)
    completeSignupRef.current?.();
  }, []);

  const resumeInicisFromPending = useCallback(async () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) return;
    const pending = await getPendingInicisSession();
    if (!pending || pending.purpose !== 'guardian_consent') return;

    try {
      const result = await resumePendingInicisFlow('guardian_consent');
      if (!isMountedRef.current || !result) return;
      setGuardianInicisClientToken(
        result.inicisClientToken || result.clientToken || null,
      );
      setAwaitingGuardianConsent(false);
      proceedToSchool();
    } catch (error) {
      if (error?.code !== 'CANCELLED') {
        Alert.alert('알림', '보호자 본인인증을 완료하지 못했습니다.');
      }
      setAwaitingGuardianConsent(true);
    }
  }, [proceedToSchool]);

  const runGuardianIdentityVerification = useCallback(async () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      setGuardianInicisClientToken('test-guardian-token');
      setAwaitingGuardianConsent(false);
      proceedToSchool();
      return;
    }

    try {
      const clientOn = isInicisClientEnabled();
      let serverOn = false;
      if (clientOn) {
        serverOn = await fetchInicisServerEnabled();
      }
      if (!clientOn || !serverOn) {
        Alert.alert(
          '보호자 인증',
          '보호자 본인인증 서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
        );
        setAwaitingGuardianConsent(true);
        return;
      }

      const pending = await getPendingInicisSession();
      const result =
        pending?.purpose === 'guardian_consent'
          ? await resumePendingInicisFlow('guardian_consent')
          : await runInicisIdentityFlow('guardian_consent');
      if (!isMountedRef.current || !result) {
        setAwaitingGuardianConsent(true);
        return;
      }
      const token = result.inicisClientToken || result.clientToken || null;
      if (!token) {
        Alert.alert('알림', '보호자 본인인증을 완료하지 못했습니다.');
        setAwaitingGuardianConsent(true);
        return;
      }
      setGuardianInicisClientToken(token);
      setAwaitingGuardianConsent(false);
      proceedToSchool();
    } catch (error) {
      if (error?.code !== 'CANCELLED') {
        Alert.alert(
          '보호자 인증 미완료',
          error?.message ||
            '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
        );
      }
      setAwaitingGuardianConsent(true);
    }
  }, [proceedToSchool]);

  const applyKakaoIdentity = useCallback(
    async (nextIdentity) => {
      setIdentityData(nextIdentity);
      setFormData((prev) => ({
        ...prev,
        name: nextIdentity.name,
        birthDate: nextIdentity.birthDate,
        phoneNumber: nextIdentity.phoneNumber,
      }));

      const birthCase = classifyBirthDateCase(nextIdentity.birthDate);
      if (birthCase === 'invalid') {
        Alert.alert('알림', '카카오에서 받은 생년월일이 올바르지 않습니다.');
        kakaoAuthRanRef.current = false;
        return;
      }
      // A(연장): 가입 허용. D만 차단. C는 보호자 동의.
      if (birthCase === 'D') {
        showTooYoungForSignupAlert(goToLogin);
        return;
      }

      const phoneOk = await assertPhoneAvailableForSignup(
        nextIdentity.phoneNumber,
        navigationRef,
      );
      if (!phoneOk) {
        kakaoAuthRanRef.current = false;
        await abortSignupImmediate();
        return;
      }

      if (birthCase === 'C') {
        setAwaitingGuardianConsent(true);
        setShowGuardianConsentModal(true);
        return;
      }
      // 재학정보·학생증 스킵 → 바로 가입
      proceedToSchool();
    },
    [abortSignupImmediate, goToLogin, navigationRef, proceedToSchool],
  );

  const runKakaoSdkAuth = useCallback(async () => {
    setKakaoBusy(true);
    setKakaoAuthError('');
    try {
      if (__DEV__) {
        console.log('[SignKakao] opening Kakao account login…');
      }
      const { accessToken, profile } = await loginWithKakao();
      if (__DEV__) {
        console.log('[SignKakao] kakao profile received', {
          id: profile?.id,
          hasName: Boolean(profile?.name || profile?.nickname),
          hasBirth: Boolean(profile?.birthyear && profile?.birthday),
          hasPhone: Boolean(profile?.phoneNumber),
        });
      }

      // 이미 연동된 계정이면 가입 대신 바로 로그인
      if (accessToken) {
        try {
          const deviceId = await getOrCreateDeviceId();
          const response = await api.post('/api/auth/oauth/kakao', {
            accessToken,
            deviceId,
          });
          const data = response.data?.data || {};
          if (data.token) {
            await setAuthToken(data.token, { persist: true });
            if (data.refreshToken) {
              await setRefreshToken(data.refreshToken, { persist: true });
            }
            await clearFlowSession();
            await login({
              studentVerificationStatus:
                data.studentVerificationStatus || 'UNVERIFIED',
              rejectReason: data.rejectReason || null,
              reverificationStatus: data.reverificationStatus || 'none',
              reverificationDeadline: data.reverificationDeadline || null,
              needsProfileUsername: Boolean(data.needsProfileUsername),
            });
            return;
          }
        } catch (oauthErr) {
          const code = oauthErr?.response?.data?.code;
          if (code && code !== 'NEEDS_SIGNUP') {
            const message =
              oauthErr?.response?.data?.message ||
              '카카오 로그인에 실패했습니다.';
            setKakaoAuthError(message);
            kakaoAuthRanRef.current = false;
            return;
          }
          // NEEDS_SIGNUP → 아래 가입 플로우 계속
        }
      }

      const nextIdentity = {
        ...mapKakaoProfileToIdentity(profile),
        kakaoAccessToken: accessToken || '',
      };
      if (!nextIdentity.birthDate) {
        Alert.alert(
          '알림',
          '생년월일을 받지 못했습니다. 카카오 동의항목(출생연도·생일)을 확인하세요.',
        );
        await abortSignupImmediate();
        return;
      }
      if (!nextIdentity.name) {
        Alert.alert(
          '알림',
          '이름을 받지 못했습니다. 카카오 동의항목(이름)을 확인하세요.',
        );
        await abortSignupImmediate();
        return;
      }
      applyKakaoIdentity(nextIdentity);
    } catch (error) {
      if (__DEV__) {
        console.warn('[SignKakao] kakao login failed', error);
      }
      await abortSignupImmediate();
    } finally {
      setKakaoBusy(false);
    }
  }, [abortSignupImmediate, applyKakaoIdentity, clearFlowSession, login]);

  const handleGuardianConsentStart = () => {
    guardianModalPendingActionRef.current = 'verification';
    setShowGuardianConsentModal(false);
  };

  const handleGuardianConsentLater = () => {
    guardianModalPendingActionRef.current = null;
    setShowGuardianConsentModal(false);
    setAwaitingGuardianConsent(true);
  };

  const handleGuardianConsentModalDismissed = useCallback(() => {
    const pending = guardianModalPendingActionRef.current;
    guardianModalPendingActionRef.current = null;
    if (!pending || !isMountedRef.current) return;
    InteractionManager.runAfterInteractions(() => {
      if (!isMountedRef.current) return;
      if (pending === 'verification') {
        void runGuardianIdentityVerification();
      }
    });
  }, [runGuardianIdentityVerification]);

  const proceedFromSchoolSelect = useCallback(() => {
    const grade = Number(schoolGradeNum);
    const classNum = Number(schoolClassNum);
    const nextForm = {
      ...formData,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      grade: String(grade),
      classNum: String(classNum),
      graduationYear: String(schoolEnrollmentPreview.graduationYear || ''),
      schoolLevel: schoolEnrollmentPreview.schoolLevel || formData.schoolLevel,
    };
    setFormData(nextForm);
    // 학생증 단계 스킵 → 바로 가입 (가입_개편). handleComplete는 아래 정의·ref로 호출
    completeSignupRef.current?.(nextForm);
  }, [
    formData,
    schoolClassNum,
    schoolEnrollmentPreview,
    schoolGradeNum,
    selectedSchool,
  ]);

  const handleSchoolSelectNext = () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      const grade = Number(schoolGradeNum) || 2;
      const classNum = Number(schoolClassNum) || 1;
      const nextForm = {
        ...formData,
        schoolId: selectedSchool?.id || formData.schoolId || 'REDESIGN_SKIP',
        schoolName:
          selectedSchool?.name || formData.schoolName || '개편테스트학교',
        grade: String(grade),
        classNum: String(classNum),
        graduationYear: String(
          schoolEnrollmentPreview.graduationYear ||
            new Date().getFullYear() + 2,
        ),
        schoolLevel: schoolEnrollmentPreview.schoolLevel || 'high',
      };
      setFormData(nextForm);
      completeSignupRef.current?.(nextForm);
      return;
    }

    if (!selectedSchool?.id || selectedSchool?.manual) {
      Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
      return;
    }
    const grade = Number(schoolGradeNum);
    if (!Number.isFinite(grade) || grade < 1) {
      Alert.alert('알림', '학년을 입력해 주세요.');
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
      message: `${selectedSchool.name} ${grade}학년 ${classNum}반이 맞나요?`,
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
      grade: String(schoolGradeNum || prev.grade || 2),
      classNum: String(schoolClassNum || prev.classNum || 1),
      graduationYear: String(
        schoolEnrollmentPreview.graduationYear || prev.graduationYear || '',
      ),
    }));
  };

  const buildSignupPayload = (finalData, verificationToken) => {
    const resolvedBirthDate =
      normalizeBirthDateForCompare(identity.birthDate) || identity.birthDate;

    return {
      // username/password 생략 — 서버가 카카오 토큰으로 임시 계정 발급
      name: (identity.name || '').trim(),
      phone: String(identity.phoneNumber || '').replace(/\D/g, ''),
      birthDate: resolvedBirthDate,
      // 재학정보 가입 시 미입력 — 인앱 학생증 인증 때 설정
      colorId: pickRandomProfileColorId(),
      verificationMethod: 'student_id',
      signupMethod: 'kakao',
      kakaoAccessToken: identityData.kakaoAccessToken || '',
      consents: consentData.consents || {},
      studentVerificationToken: verificationToken || undefined,
      studentInicisClientToken: null,
      guardianInicisClientToken: guardianInicisClientToken || null,
    };
  };

  const finishSignupAndEnterApp = async () => {
    const accessToken = identityData.kakaoAccessToken;
    if (!accessToken) {
      throw new Error('카카오 토큰이 없습니다. 다시 로그인해 주세요.');
    }
    const deviceId = await getOrCreateDeviceId();
    const loginRes = await api.post('/api/auth/oauth/kakao', {
      accessToken,
      deviceId,
    });
    const {
      token,
      refreshToken,
      studentVerificationStatus: status,
      rejectReason,
    } = loginRes.data?.data || {};
    if (token) {
      await setAuthToken(token, { persist: true });
    }
    if (refreshToken) {
      await setRefreshToken(refreshToken, { persist: true });
    }
    await login({
      studentVerificationStatus: status || 'UNVERIFIED',
      rejectReason: rejectReason || null,
      needsProfileUsername: Boolean(
        loginRes.data?.data?.needsProfileUsername,
      ),
    });
  };

  const handleComplete = async (overrideFormData = null) => {
    const finalData = overrideFormData
      ? { ...overrideFormData }
      : { ...formData };
    const verificationToken =
      studentVerificationToken ||
      (SIGNUP_REDESIGN_SKIP_VALIDATION ? MOCK_STUDENT_TOKEN : null);
    // 학생증 토큰 없이도 가입 가능

    if (!identityData.kakaoAccessToken && !SIGNUP_REDESIGN_SKIP_VALIDATION) {
      Alert.alert('알림', '카카오 인증이 필요합니다. 다시 시도해 주세요.');
      setCurrentStep(STEP.KAKAO_AUTH);
      return;
    }

    setSubmitting(true);
    try {
      if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
        await clearFlowSession();
        await login({ studentVerificationStatus: 'UNVERIFIED' });
        return;
      }

      const payload = buildSignupPayload(
        finalData,
        verificationToken || undefined,
      );
      payload.inviteCode = await peekPendingInviteCode();
      await api.post('/api/auth/signup', payload);
      await consumePendingInviteCode();
      await clearFlowSession();
      await finishSignupAndEnterApp();
    } catch (error) {
      if (alertSignupDuplicateAndOfferLogin(error, navigation)) {
        return;
      }
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };
  completeSignupRef.current = handleComplete;

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.KAKAO_AUTH:
        return '카카오 인증';
      case STEP.SCHOOL_SELECT:
        return '재학 정보 입력';
      case STEP.STUDENT_VERIFY:
        return studentVerified ? '가입 마무리' : '학생증 인증';
      case STEP.ALT_VERIFY_CHOICE:
        return '다른 방법으로 인증';
      case STEP.CERTIFICATE_GUIDE:
        return '재학증명서 가이드';
      case STEP.CERTIFICATE_SUBMIT:
        return '재학증명서 제출';
      case STEP.NEIS_PLUS_SUBMIT:
        return 'NEIS+ 제출';
      default:
        return '회원가입';
    }
  };

  const handlePrimaryPress = () => {
    if (currentStep === STEP.KAKAO_AUTH) {
      if (awaitingGuardianConsent) {
        setShowGuardianConsentModal(true);
        return;
      }
      kakaoAuthRanRef.current = true;
      void runKakaoSdkAuth();
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
      return;
    }
    if (currentStep === STEP.CERTIFICATE_SUBMIT) {
      void handleComplete();
      return;
    }
  };

  const isPrimaryDisabled = () => {
    if (submitting || kakaoBusy) return true;
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      if (currentStep === STEP.KAKAO_AUTH) return false;
      if (currentStep === STEP.STUDENT_VERIFY) return false;
      if (currentStep === STEP.CERTIFICATE_SUBMIT) return false;
      return false;
    }
    if (currentStep === STEP.KAKAO_AUTH) {
      return !(awaitingGuardianConsent || Boolean(kakaoAuthError));
    }
    if (currentStep === STEP.SCHOOL_SELECT) {
      if (!selectedSchool?.id || selectedSchool?.manual) return true;
      if (!Number(schoolGradeNum) || Number(schoolGradeNum) < 1) return true;
      if (!Number(schoolClassNum) || Number(schoolClassNum) < 1) return true;
    }
    if (currentStep === STEP.STUDENT_VERIFY && !studentVerified) return true;
    if (currentStep === STEP.CERTIFICATE_SUBMIT) {
      if (!certificateData.certificateUrl?.trim() || !certificateData.accessNumber?.trim()) return true;
    }
    return false;
  };

  const primaryLabel = () => {
    if (currentStep === STEP.KAKAO_AUTH) {
      return awaitingGuardianConsent ? '보호자 인증하기' : '다시 시도';
    }
    if (
      SIGNUP_REDESIGN_SKIP_VALIDATION &&
      currentStep === STEP.STUDENT_VERIFY &&
      !studentVerified
    ) {
      return '테스트 인증 완료';
    }
    if (currentStep === STEP.STUDENT_VERIFY && studentVerified)
      return '제출하기';
    if (currentStep === STEP.CERTIFICATE_SUBMIT) return '제출하기';
    return '다음 단계';
  };

  const showPrimaryFooter =
    (currentStep === STEP.KAKAO_AUTH &&
      !kakaoBusy &&
      (awaitingGuardianConsent || Boolean(kakaoAuthError))) ||
    currentStep === STEP.SCHOOL_SELECT ||
    currentStep === STEP.CERTIFICATE_SUBMIT;

  const isSignupCompleteScreen =
    currentStep === STEP.STUDENT_VERIFY && studentVerified;

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
        if (!cancelled && pending?.provider === 'kakao') {
          applySessionSnapshot(pending.snapshot);
          if (pending.snapshot?.identityData?.name) {
            kakaoAuthRanRef.current = true;
          }
          if (!cancelled) {
            await resumeInicisFromPending();
          }
        }
      } else if (route.params?.consents) {
        setConsentData(route.params.consents);
        setCurrentStep(STEP.KAKAO_AUTH);
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
    if (currentStep !== STEP.KAKAO_AUTH || !sessionHydratedRef.current) return;
    if (kakaoAuthRanRef.current) return;
    kakaoAuthRanRef.current = true;
    void runKakaoSdkAuth();
  }, [currentStep, runKakaoSdkAuth]);

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
      {!isSignupCompleteScreen ? (
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={requestAbortSignup}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="가입 중단"
              >
                <Feather
                  name="x"
                  size={normalize(20)}
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
      ) : null}

      <View style={styles.contentSection}>
        {currentStep === STEP.KAKAO_AUTH && (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: normalize(24) }}
          >
            {awaitingGuardianConsent && !kakaoBusy ? (
              <>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: normalize(18),
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: normalize(10),
                  }}
                >
                  보호자 본인인증이 필요해요
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: normalize(14),
                    lineHeight: normalize(22),
                    textAlign: 'center',
                  }}
                >
                  만 14세 미만은 보호자 인증 후 가입을 이어갈 수 있어요.{'\n'}
                  준비가 되면 아래에서 인증을 시작해 주세요.
                </Text>
              </>
            ) : kakaoBusy || !kakaoAuthError ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{ marginTop: normalize(16), color: colors.textSecondary, textAlign: 'center' }}
                >
                  카카오 로그인을 여는 중…
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: normalize(16),
                    textAlign: 'center',
                    marginBottom: normalize(8),
                  }}
                >
                  카카오 로그인을 열지 못했습니다
                </Text>
                <Text
                  style={{
                    marginTop: normalize(8),
                    color: '#C62828',
                    fontSize: normalize(13),
                    textAlign: 'center',
                  }}
                >
                  {kakaoAuthError}
                </Text>
              </>
            )}
          </View>
        )}

        {currentStep === STEP.SCHOOL_SELECT && (
          <SignStepSchoolSelect
            styles={styles}
            normalize={normalize}
            selectedSchool={selectedSchool}
            onSelect={setSelectedSchool}
            gradeNum={schoolGradeNum}
            onGradeNumChange={setSchoolGradeNum}
            classNum={schoolClassNum}
            onClassNumChange={setSchoolClassNum}
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
            onCertificateGuide={handleAltVerifyChoiceOpen}
            onConfirm={() => void handleComplete()}
            submitting={submitting}
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
            styles={styles}
            normalize={normalize}
            mode="signup"
            layout="stable"
            identity={identity}
            schoolId={selectedSchool?.id || formData.schoolId}
            onVerified={handleStudentVerified}
            onBack={() => setCurrentStep(STEP.ALT_VERIFY_CHOICE)}
          />
        )}
      </View>

      {showPrimaryFooter ? (
        <SignupPrimaryFooter
          label={primaryLabel()}
          onPress={handlePrimaryPress}
          disabled={isPrimaryDisabled()}
          loading={submitting}
          cancelParentPadding
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        />
      ) : null}

      <SignStepGuardianConsentModal
        visible={showGuardianConsentModal}
        normalize={normalize}
        onStart={handleGuardianConsentStart}
        onLater={handleGuardianConsentLater}
        onDismissed={handleGuardianConsentModalDismissed}
      />

      <SignupBlockingAlertModal
        visible={blockingAlert.visible}
        title={blockingAlert.title}
        message={blockingAlert.message}
        buttons={blockingAlert.buttons}
        buttonsLayout={blockingAlert.buttonsLayout}
        onRequestClose={closeBlockingAlert}
      />

      <SubmittingLockModal visible={submitting} message="가입 처리 중…" />
    </SafeAreaView>
  );

  function handleAltVerifyChoiceOpen() {
    setCurrentStep(STEP.ALT_VERIFY_CHOICE);
  }
};

export default SignKakao;
