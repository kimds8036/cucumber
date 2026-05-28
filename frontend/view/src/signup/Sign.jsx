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
import SignStepAgeGate from './SignStepAgeGate';
import SignStepConsent from './SignStepConsent';
import SignStep1 from './SignStep1';
import SignStep2 from './SignStep2';
import SignStep4 from './SignStep4';
import SignStepVerificationMethod from './SignStepVerificationMethod';
import SignStepCertificate from './SignStepCertificate';
import SignStepNumber from './SignStepNumber';
import SignStepSchoolSelect from './SignStepSchoolSelect';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import { api } from '../../../utils/api';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import Skeleton from '../../../components/common/Skeleton';
import { showUnder14BlockAlert } from './authFeatureAlerts';

const DISABLE_SIGN_VALIDATION_FOR_REDESIGN = true;

/** Target Flow step indices (만 14세 미만은 Step 0에서 차단) */
const STEP = {
  AGE: 0,
  CONSENT: 1,
  PASS: 2,
  SCHOOL: 3,
  VERIFY_METHOD: 4,
  STUDENT_VERIFY: 5,
  ACCOUNT: 6,
  PROFILE: 7,
};

const Sign = ({ navigation }) => {
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(STEP.AGE);
  const [formData, setFormData] = useState({});
  const [ageGateBirthDate, setAgeGateBirthDate] = useState('');
  const [recognizedData, setRecognizedData] = useState(null);
  const [studentVerified, setStudentVerified] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [step1Data, setStep1Data] = useState({});
  const [stepInfoData, setStepInfoData] = useState({});
  const [step4Data, setStep4Data] = useState({});
  const [stepNumberData, setStepNumberData] = useState({});
  const [selectedVerificationMethod, setSelectedVerificationMethod] =
    useState('');
  const [consentData, setConsentData] = useState({ allConsented: false });
  const [completeModalType, setCompleteModalType] = useState('signup');
  const [screenReady, setScreenReady] = useState(false);

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  const isCertificateFlow = selectedVerificationMethod === 'certificate';
  const maxFlowStep = isCertificateFlow ? STEP.ACCOUNT : STEP.PROFILE;

  const progressWidth = (currentStep / maxFlowStep) * 100;
  const isCameraStep =
    currentStep === STEP.STUDENT_VERIFY && !isCertificateFlow;

  const identity = useMemo(
    () => ({
      name: step1Data.name || formData.name || '',
      birthDate:
        step1Data.birthDate || formData.birthDate || ageGateBirthDate || '',
      phoneNumber: step1Data.phoneNumber || formData.phoneNumber || '',
    }),
    [step1Data, formData, ageGateBirthDate],
  );

  const isUnder14ByBirthDate = useCallback((birthDate) => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasNotHadBirthdayYet =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() < birth.getDate());
    if (hasNotHadBirthdayYet) age -= 1;
    return age < 14;
  }, []);

  const handleBack = () => {
    if (currentStep === STEP.AGE) {
      navigation.goBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleAgeGateNext = () => {
    const birthDate = ageGateBirthDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || '')) {
      Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
      return;
    }
    if (isUnder14ByBirthDate(birthDate)) {
      showUnder14BlockAlert(() => resetTo('Login'));
      return;
    }
    setFormData((prev) => ({ ...prev, birthDate }));
    setCurrentStep(STEP.CONSENT);
  };

  const handleConsentNext = () => {
    if (!consentData.allConsented) return;
    setCurrentStep(STEP.PASS);
  };

  const handleStep1Next = () => {
    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN && !step1Data.isVerified) {
      Alert.alert('알림', '본인인증을 완료해 주세요.');
      return;
    }
    const merged = {
      ...formData,
      name: step1Data.name || '',
      birthDate: step1Data.birthDate || formData.birthDate || ageGateBirthDate,
      phoneNumber: step1Data.phoneNumber || '',
      ...step1Data,
    };
    if (isUnder14ByBirthDate(merged.birthDate)) {
      showUnder14BlockAlert(() => resetTo('Login'));
      return;
    }
    setFormData(merged);
    setCurrentStep(STEP.SCHOOL);
  };

  const handleSchoolNext = () => {
    if (!selectedSchool?.id) {
      Alert.alert('알림', '학교를 선택해 주세요.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
    }));
    setCurrentStep(STEP.VERIFY_METHOD);
  };

  const handleVerificationMethodNext = () => {
    if (!selectedVerificationMethod) {
      Alert.alert('알림', '학생 인증 방식을 선택해 주세요.');
      return;
    }
    setRecognizedData(null);
    setStudentVerified(false);
    setCurrentStep(STEP.STUDENT_VERIFY);
  };

  const handleStudentVerified = (data) => {
    setRecognizedData(data);
    setStudentVerified(true);
    setFormData((prev) => ({
      ...prev,
      schoolId: data.schoolId || selectedSchool?.id,
      schoolName: data.school || selectedSchool?.name,
      grade: data.grade,
      classNum: data.class,
    }));
    Alert.alert(
      '학교 확인',
      `${data.school || selectedSchool?.name}\n${
        selectedSchool?.region ? `${selectedSchool.region}\n` : ''
      }이 학교가 맞나요?`,
      [
        {
          text: '다시 촬영',
          style: 'cancel',
          onPress: () => {
            setStudentVerified(false);
            setRecognizedData(null);
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
    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
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
    }
    setFormData((prev) => ({ ...prev, ...stepInfoData }));
    setCurrentStep(STEP.PROFILE);
  };

  const handleCertificateSubmit = () => {
    if (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) {
      Alert.alert('알림', '증명서 URL과 접수 번호를 입력해 주세요.');
      return;
    }
    setCompleteModalType('certificate');
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    const finalData = { ...formData, ...step4Data, ...stepInfoData };

    if (DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      setCompleteModalType('signup');
      setShowCompleteModal(true);
      return;
    }

    try {
      const payload = {
        username: finalData.username,
        password: finalData.password,
        name: finalData.name || identity.name,
        phone: finalData.phoneNumber || identity.phoneNumber,
        birthDate: finalData.birthDate || identity.birthDate,
        schoolId: finalData.schoolId || selectedSchool?.id,
        grade: Number(finalData.grade) || 1,
        classNumber: Number(finalData.classNum) || 1,
        graduationYear:
          finalData.graduationYear ||
          String(new Date().getFullYear() + 1),
        colorId: 1,
      };

      await api.post('/api/auth/signup', payload);
      setCompleteModalType('signup');
      setShowCompleteModal(true);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    }
  };

  const handleGoToLogin = () => {
    setShowCompleteModal(false);
    resetTo('Login');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.AGE:
        return '연령 확인';
      case STEP.CONSENT:
        return '약관 동의';
      case STEP.PASS:
        return '본인 인증';
      case STEP.SCHOOL:
        return '학교 선택';
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
      case STEP.AGE:
        return '생년월일을 입력해 주세요.';
      case STEP.CONSENT:
        return '서비스 이용을 위한 필수 동의 항목을 확인해 주세요.';
      case STEP.PASS:
        return '휴대폰 본인인증으로 이름과 생년월일을 확인합니다.';
      case STEP.SCHOOL:
        return '재학 중인 학교를 검색해 선택해 주세요.';
      case STEP.VERIFY_METHOD:
        return '학생증 OCR 인증 또는 증명서 제출 중 선택해 주세요.';
      case STEP.STUDENT_VERIFY:
        return isCertificateFlow
          ? '학생증이 없는 경우 증명서 제출 안내를 확인해 주세요.'
          : '학생증을 촬영하면 이름·학교·학교급을 자동으로 확인합니다.';
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
      case STEP.AGE:
        handleAgeGateNext();
        break;
      case STEP.CONSENT:
        handleConsentNext();
        break;
      case STEP.PASS:
        handleStep1Next();
        break;
      case STEP.SCHOOL:
        handleSchoolNext();
        break;
      case STEP.VERIFY_METHOD:
        handleVerificationMethodNext();
        break;
      case STEP.STUDENT_VERIFY:
        if (isCertificateFlow) setCurrentStep(STEP.ACCOUNT);
        break;
      case STEP.ACCOUNT:
        if (isCertificateFlow) {
          handleCertificateSubmit();
        } else {
          handleAccountNext();
        }
        break;
      case STEP.PROFILE:
        handleComplete();
        break;
      default:
        break;
    }
  };

  const isPrimaryDisabled = () => {
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.VERIFY_METHOD && !selectedVerificationMethod)
      return true;
    if (currentStep === STEP.SCHOOL && !selectedSchool?.id) return true;
    if (currentStep === STEP.AGE && !/^\d{4}-\d{2}-\d{2}$/.test(ageGateBirthDate))
      return true;
    if (
      currentStep === STEP.ACCOUNT &&
      isCertificateFlow &&
      (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber)
    ) {
      return true;
    }
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
        {currentStep === STEP.AGE && (
          <SignStepAgeGate
            styles={styles}
            normalize={normalize}
            onBirthDateChange={setAgeGateBirthDate}
          />
        )}
        {currentStep === STEP.CONSENT && (
          <SignStepConsent
            normalize={normalize}
            selectedAgeGroup="over14"
            onChange={setConsentData}
          />
        )}
        {currentStep === STEP.PASS && (
          <SignStep1
            styles={styles}
            normalize={normalize}
            onChange={setStep1Data}
            disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
            passMode
          />
        )}
        {currentStep === STEP.SCHOOL && (
          <SignStepSchoolSelect
            styles={styles}
            normalize={normalize}
            selectedSchool={selectedSchool}
            onSelect={setSelectedSchool}
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
              selectedSchool={selectedSchool}
              onVerified={handleStudentVerified}
              disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
            />
          ))}
        {currentStep === STEP.ACCOUNT &&
          (isCertificateFlow ? (
            <SignStepNumber
              styles={styles}
              normalize={normalize}
              onChange={setStepNumberData}
            />
          ) : (
            <SignStep2
              styles={styles}
              normalize={normalize}
              verifiedName={identity.name}
              verifiedBirthDate={identity.birthDate}
              onChange={setStepInfoData}
            />
          ))}
        {currentStep === STEP.PROFILE && !isCertificateFlow && (
          <SignStep4
            styles={styles}
            normalize={normalize}
            recognizedData={recognizedData}
            onChange={setStep4Data}
          />
        )}
      </View>

      {!isCameraStep && (
        <View style={styles.footerSection}>
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
                <Text style={styles.nextButtonText}>{primaryLabel()}</Text>
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
              {completeModalType === 'certificate'
                ? '제출 성공'
                : '회원가입 성공'}
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
