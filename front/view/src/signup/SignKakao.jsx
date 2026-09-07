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
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepGuardianConsentModal from './SignStepGuardianConsentModal';
import SignupBlockingAlertModal from './SignupBlockingAlertModal';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SignStepSchoolSelect from './SignStepSchoolSelect';
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
} from '../../../services/inicisAuth';
import { useAuth } from '../../../context/AuthContext';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import {
  showTooOldForSignupAlert,
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
  KAKAO_MOCK_PROFILE,
  KAKAO_MOCK_PROFILE_ADULT,
  KAKAO_MOCK_PROFILE_UNDER14,
  toKakaoIdentityData,
} from './kakaoSignupMocks';
import { ALLOW_ADULT_SIGNUP_IN_DEV } from './signupAdultTestMode';
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
  const [submitting, setSubmitting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);
  const [useUnder14Mock, setUseUnder14Mock] = useState(false);
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
      useUnder14Mock,
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
      useUnder14Mock,
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
    if (snapshot.useUnder14Mock != null)
      setUseUnder14Mock(snapshot.useUnder14Mock);
    if (snapshot.currentStep) {
      const step =
        snapshot.currentStep === 'account'
          ? STEP.SCHOOL_SELECT
          : snapshot.currentStep;
      setCurrentStep(step);
    }
  }, []);

  const clearFlowSession = useCallback(async () => {
    await clearSignupPendingSession('kakao');
    await clearPendingInicisSession();
    cancelInicisFlow();
  }, []);

  const goToLogin = useCallback(() => {
    resetTo('Login');
  }, [resetTo]);

  const closeBlockingAlert = useCallback(() => {
    setBlockingAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const proceedToSchool = useCallback(() => {
    setCurrentStep(STEP.SCHOOL_SELECT);
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
      proceedToSchool();
    } catch (error) {
      if (error?.code !== 'CANCELLED') {
        Alert.alert('알림', '보호자 본인인증을 완료하지 못했습니다.');
      }
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
      // 학교 선택 전에 즉시 연령 차단 (성인 테스트 모드일 때만 A 통과)
      if (birthCase === 'A' && !ALLOW_ADULT_SIGNUP_IN_DEV) {
        showTooOldForSignupAlert(goToLogin);
        return;
      }
      if (birthCase === 'D') {
        showTooYoungForSignupAlert(goToLogin);
        return;
      }

      const phoneOk = await assertPhoneAvailableForSignup(
        nextIdentity.phoneNumber,
        navigation,
      );
      if (!phoneOk) {
        kakaoAuthRanRef.current = false;
        await clearFlowSession();
        return;
      }

      if (birthCase === 'C') {
        setShowGuardianConsentModal(true);
        return;
      }
      // B 또는 (A+성인테스트): 학적 추론 불가하면 동일하게 조기 차단
      const enrollment = buildEnrollmentFromBirthDate(nextIdentity.birthDate);
      if (
        !ALLOW_ADULT_SIGNUP_IN_DEV &&
        (enrollment.schoolLevel == null || enrollment.grade == null)
      ) {
        showTooOldForSignupAlert(goToLogin);
        return;
      }
      proceedToSchool();
    },
    [clearFlowSession, goToLogin, navigation, proceedToSchool],
  );

  const runKakaoMockAuth = useCallback(
    (profile) => {
      applyKakaoIdentity(toKakaoIdentityData(profile));
    },
    [applyKakaoIdentity],
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
                data.studentVerificationStatus || 'PENDING',
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
        setKakaoAuthError(
          '생년월일을 받지 못했습니다. 카카오 동의항목(출생연도·생일)을 확인하세요.',
        );
        kakaoAuthRanRef.current = false;
        return;
      }
      if (!nextIdentity.name) {
        setKakaoAuthError(
          '이름을 받지 못했습니다. 카카오 동의항목(이름)을 확인하세요.',
        );
        kakaoAuthRanRef.current = false;
        return;
      }
      applyKakaoIdentity(nextIdentity);
    } catch (error) {
      if (error?.code === 'CANCELLED') {
        setKakaoAuthError('카카오 로그인이 취소되었습니다. 다시 시도해 주세요.');
        kakaoAuthRanRef.current = false;
        return;
      }
      const message =
        error?.message || String(error || '카카오 로그인에 실패했습니다.');
      setKakaoAuthError(message);
      kakaoAuthRanRef.current = false;
      if (__DEV__) {
        console.warn('[SignKakao] kakao login failed', error);
      }
    } finally {
      setKakaoBusy(false);
    }
  }, [applyKakaoIdentity, clearFlowSession, login]);

  const handleGuardianConsentStart = () => {
    setShowGuardianConsentModal(false);
    guardianModalPendingActionRef.current = 'after_guardian';
    InteractionManager.runAfterInteractions(async () => {
      if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
        setGuardianInicisClientToken('test-guardian-token');
        proceedToSchool();
        return;
      }
      Alert.alert('알림', '보호자 본인인증은 추후 연동됩니다.');
    });
  };

  const handleGuardianConsentLater = () => {
    guardianModalPendingActionRef.current = null;
    setShowGuardianConsentModal(false);
  };

  const proceedFromSchoolSelect = useCallback(() => {
    const grade = Number(schoolGradeNum);
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
  }, [
    schoolClassNum,
    schoolEnrollmentPreview,
    schoolGradeNum,
    selectedSchool,
  ]);

  const handleSchoolSelectNext = () => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      const grade = Number(schoolGradeNum) || 2;
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
    const enrollment = buildEnrollmentFromBirthDate(resolvedBirthDate);

    return {
      // username/password 생략 — 서버가 카카오 토큰으로 임시 계정 발급
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
      signupMethod: 'kakao',
      kakaoAccessToken: identityData.kakaoAccessToken || '',
      consents: consentData.consents || {},
      studentVerificationToken: verificationToken,
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
      studentVerificationStatus: status || 'PENDING',
      rejectReason: rejectReason || null,
      needsProfileUsername: Boolean(
        loginRes.data?.data?.needsProfileUsername,
      ),
    });
  };

  const handleComplete = async () => {
    const finalData = { ...formData };
    const verificationToken =
      studentVerificationToken ||
      (SIGNUP_REDESIGN_SKIP_VALIDATION ? MOCK_STUDENT_TOKEN : null);
    if (!verificationToken) {
      Alert.alert('알림', '학생증 인증을 먼저 완료해 주세요.');
      return;
    }
    if (!identityData.kakaoAccessToken && !SIGNUP_REDESIGN_SKIP_VALIDATION) {
      Alert.alert('알림', '카카오 인증이 필요합니다. 다시 시도해 주세요.');
      setCurrentStep(STEP.KAKAO_AUTH);
      return;
    }

    setSubmitting(true);
    try {
      if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
        await clearFlowSession();
        await login({ studentVerificationStatus: 'PENDING' });
        return;
      }

      const payload = buildSignupPayload(finalData, verificationToken);
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

  const handleBack = async () => {
    if (submitting) return;

    if (currentStep === STEP.KAKAO_AUTH) {
      await clearFlowSession();
      navigation.navigate('SignupEntry');
      return;
    }
    if (currentStep === STEP.SCHOOL_SELECT) {
      await clearFlowSession();
      navigation.navigate('SignupEntry');
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
    if (currentStep === STEP.KAKAO_AUTH) return false;
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
    if (currentStep === STEP.KAKAO_AUTH) return '다시 시도';
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
    (currentStep === STEP.KAKAO_AUTH && Boolean(kakaoAuthError) && !kakaoBusy) ||
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
      ) : null}

      <View style={styles.contentSection}>
        {currentStep === STEP.KAKAO_AUTH && (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: normalize(24) }}
          >
            {kakaoBusy || !kakaoAuthError ? (
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
            {__DEV__ ? (
              <TouchableOpacity
                style={{ marginTop: normalize(28) }}
                disabled={kakaoBusy}
                onLongPress={() => {
                  Alert.alert(
                    '[DEV] mock 가입',
                    '카카오 SDK 없이 mock 프로필로 다음 단계로 갈까요?',
                    [
                      { text: '취소', style: 'cancel' },
                      {
                        text: 'mock으로 계속',
                        onPress: () => {
                          const profile = useUnder14Mock
                            ? KAKAO_MOCK_PROFILE_UNDER14
                            : ALLOW_ADULT_SIGNUP_IN_DEV
                              ? KAKAO_MOCK_PROFILE_ADULT
                              : KAKAO_MOCK_PROFILE;
                          kakaoAuthRanRef.current = true;
                          runKakaoMockAuth(profile);
                        },
                      },
                      {
                        text: '연령 mock 전환',
                        onPress: () => setUseUnder14Mock((v) => !v),
                      },
                    ],
                  );
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: normalize(12),
                    textAlign: 'center',
                  }}
                >
                  [DEV] 실패 시에만 길게 눌러 mock
                  {useUnder14Mock
                    ? ' (만14미만)'
                    : ALLOW_ADULT_SIGNUP_IN_DEV
                      ? ' (성인)'
                      : ' (만14이상)'}
                </Text>
              </TouchableOpacity>
            ) : null}
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
        onDismissed={() => {}}
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

  function handleAltVerifyChoiceOpen() {
    setCurrentStep(STEP.ALT_VERIFY_CHOICE);
  }
};

export default SignKakao;
