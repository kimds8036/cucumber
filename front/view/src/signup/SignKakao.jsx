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
import Skeleton from '../../../components/common/Skeleton';
import { api, setAuthToken } from '../../../utils/api';
import { peekPendingInviteCode, consumePendingInviteCode } from '../../../utils/inviteReferral';
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
  GRADE_MISMATCH_HELP_TITLE,
  GRADE_MISMATCH_HELP_MESSAGE,
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
  KAKAO_MOCK_PROFILE_UNDER14,
  toKakaoIdentityData,
} from './kakaoSignupMocks';
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

const MOCK_ACCOUNT = {
  username: 'kakao_testuser',
  password: 'Test1234',
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
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentVerificationToken, setStudentVerificationToken] = useState(null);
  const [recognizedData, setRecognizedData] = useState(null);
  const [certificateData, setCertificateData] = useState({
    certificateUrl: '',
    accessNumber: '',
  });
  const [guardianInicisClientToken, setGuardianInicisClientToken] = useState(null);
  const [showGuardianConsentModal, setShowGuardianConsentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [footerHeight, setFooterHeight] = useState(88);
  const [useUnder14Mock, setUseUnder14Mock] = useState(false);
  const [blockingAlert, setBlockingAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: '확인', onPress: () => {} }],
  });

  const isMountedRef = useRef(true);
  const sessionHydratedRef = useRef(false);
  const kakaoAuthRanRef = useRef(false);
  const prevUnder14MockRef = useRef(useUnder14Mock);
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

  const schoolGradeLabel = useMemo(() => {
    const g = schoolEnrollmentPreview.grade;
    if (g == null || !Number.isFinite(Number(g))) return '';
    return `${Number(g)}학년`;
  }, [schoolEnrollmentPreview.grade]);

  const progressWidth = useMemo(() => {
    const map = {
      [STEP.KAKAO_AUTH]: 15,
      [STEP.SCHOOL_SELECT]: 40,
      [STEP.STUDENT_VERIFY]: studentVerified ? 90 : 65,
      [STEP.ALT_VERIFY_CHOICE]: 70,
      [STEP.CERTIFICATE_GUIDE]: 75,
      [STEP.NEIS_PLUS_SUBMIT]: 80,
      [STEP.CERTIFICATE_SUBMIT]: 85,
    };
    return map[currentStep] || 20;
  }, [currentStep, studentVerified]);

  const buildSessionSnapshot = useCallback(
    () => ({
      currentStep,
      consentData,
      identityData,
      formData,
      selectedSchool,
      schoolClassNum,
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
    if (snapshot.schoolClassNum != null) setSchoolClassNum(snapshot.schoolClassNum);
    if (snapshot.studentVerified != null) setStudentVerified(snapshot.studentVerified);
    if (snapshot.studentVerificationToken) {
      setStudentVerificationToken(snapshot.studentVerificationToken);
    }
    if (snapshot.recognizedData) setRecognizedData(snapshot.recognizedData);
    if (snapshot.guardianInicisClientToken) {
      setGuardianInicisClientToken(snapshot.guardianInicisClientToken);
    }
    if (snapshot.certificateData) setCertificateData(snapshot.certificateData);
    if (snapshot.useUnder14Mock != null) setUseUnder14Mock(snapshot.useUnder14Mock);
    if (snapshot.currentStep) setCurrentStep(snapshot.currentStep);
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

  const runKakaoMockAuth = useCallback(
    async (profile) => {
      const nextIdentity = toKakaoIdentityData(profile);
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
      if (birthCase === 'C') {
        setShowGuardianConsentModal(true);
        return;
      }
      proceedToSchool();
    },
    [goToLogin, proceedToSchool],
  );

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
      username: finalData.username || MOCK_ACCOUNT.username,
      password: finalData.password || MOCK_ACCOUNT.password,
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
      studentInicisClientToken: identityData.inicisClientToken || null,
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
    const finalData = { ...formData, ...MOCK_ACCOUNT };
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
    if (currentStep === STEP.KAKAO_AUTH) {
      const profile = useUnder14Mock
        ? KAKAO_MOCK_PROFILE_UNDER14
        : KAKAO_MOCK_PROFILE;
      void runKakaoMockAuth(profile);
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
      if (currentStep === STEP.KAKAO_AUTH) return false;
      if (currentStep === STEP.STUDENT_VERIFY) return false;
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
    if (currentStep === STEP.KAKAO_AUTH) return '카카오 인증 계속';
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

  const showPrimaryFooter = [STEP.SCHOOL_SELECT, STEP.STUDENT_VERIFY].includes(
    currentStep,
  );

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
    const profile = useUnder14Mock
      ? KAKAO_MOCK_PROFILE_UNDER14
      : KAKAO_MOCK_PROFILE;
    const timer = setTimeout(() => {
      void runKakaoMockAuth(profile);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentStep, runKakaoMockAuth, useUnder14Mock]);

  useEffect(() => {
    if (!__DEV__) return;
    if (prevUnder14MockRef.current === useUnder14Mock) return;
    prevUnder14MockRef.current = useUnder14Mock;
    kakaoAuthRanRef.current = false;
  }, [useUnder14Mock]);

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
        {currentStep === STEP.KAKAO_AUTH && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: normalize(16), color: colors.textMuted }}>
              카카오 계정 정보를 불러오는 중…
            </Text>
            {__DEV__ ? (
              <TouchableOpacity
                style={{ marginTop: normalize(24) }}
                onPress={() => setUseUnder14Mock((v) => !v)}
              >
                <Text style={{ color: colors.primaryDark, fontSize: normalize(13) }}>
                  [DEV] {useUnder14Mock ? '만14미만 mock' : '만14이상 mock'} — 탭하여 전환
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
            onCertificateGuide={handleAltVerifyChoiceOpen}
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

      {showPrimaryFooter ? (
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
