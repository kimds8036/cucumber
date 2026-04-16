import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Keyboard, TouchableWithoutFeedback, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import SignStepAgeGate from './signup/SignStepAgeGate';
import SignStepConsent from './signup/SignStepConsent';
import SignStep1 from './signup/SignStep1';
import SignStep2 from './signup/SignStep2';
import SignStep1_2 from './signup/SignStep1-2';
import SignStep3 from './signup/SignStep3';
import SignStep4 from './signup/SignStep4';
import SignStepVerificationMethod from './signup/SignStepVerificationMethod';
import SignStepCertificate from './signup/SignStepCertificate';
import SignStepNumber from './signup/SignStepNumber';
import { api } from '../../utils/api';
import { useAppNavigation } from '../../navigation/useAppNavigation';

// TODO: 재디자인 완료 후 false로 되돌려 유효성 검사를 다시 활성화하세요.
const DISABLE_SIGN_VALIDATION_FOR_REDESIGN = true;

const Sign = ({ navigation }) => {
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [recognizedData, setRecognizedData] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [step1Data, setStep1Data] = useState({});
  const [stepInfoData, setStepInfoData] = useState({});
  const [guardianStepData, setGuardianStepData] = useState({});
  const [step4Data, setStep4Data] = useState({});
  const [stepNumberData, setStepNumberData] = useState({});
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [selectedVerificationMethod, setSelectedVerificationMethod] = useState('');
  const [consentData, setConsentData] = useState({ allConsented: false });
  const [completeModalType, setCompleteModalType] = useState('signup');

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);
  const isOver14Flow = selectedAgeGroup === 'over14';
  const maxFlowStep = isOver14Flow ? 6 : 7;
  const verificationStep = isOver14Flow ? 5 : 6;
  const finalStep = isOver14Flow ? 6 : 7;
  const isCameraStep =
    currentStep === verificationStep &&
    selectedVerificationMethod === 'studentId';

  // 진행바 애니메이션
  const progressWidth = (currentStep / maxFlowStep) * 100;

  // 뒤로가기 처리
  const handleBack = () => {
    if (currentStep === 0) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAgeGateSelect = (ageGroup) => {
    setSelectedAgeGroup(ageGroup);
  };

  const handleStep0Next = () => {
    if (!selectedAgeGroup) {
      Alert.alert('알림', '연령대를 선택해주세요.');
      return;
    }
    setFormData({ ...formData, ageGroup: selectedAgeGroup });
    setCurrentStep(1);
  };

  const handleConsentNext = () => {
    setCurrentStep(2);
  };

  // 본인인증 단계 완료
  const handleStep1Next = () => {
    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN && !step1Data.isVerified) {
      Alert.alert('알림', 'PASS 본인인증을 완료해주세요.');
      return;
    }

    const merged = {
      ...formData,
      name: step1Data.name || '',
      birthDate: step1Data.birthDate || '',
      phoneNumber: step1Data.phoneNumber || '',
      ...step1Data,
    };
    setFormData(merged);
    setCurrentStep(3);
  };

  // 보호자 본인인증 단계 완료(미만 플로우)
  const handleStep2Next = () => {
    if (isOver14Flow) {
      setCurrentStep(4);
      return;
    }

    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN && !guardianStepData.guardianIsVerified) {
      Alert.alert('알림', '보호자 본인인증을 먼저 완료해주세요.');
      return;
    }
    setFormData({ ...formData, ...guardianStepData });
    setCurrentStep(4);
  };

  // 정보 입력 단계 완료
  const handleStep3Next = () => {
    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      if (!stepInfoData.username || !stepInfoData.password || !stepInfoData.passwordConfirm) {
        Alert.alert('알림', '아이디와 비밀번호 정보를 모두 입력해주세요.');
        return;
      }
      if (stepInfoData.password !== stepInfoData.passwordConfirm) {
        Alert.alert('알림', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }
    setFormData({ ...formData, ...stepInfoData });
    setCurrentStep(5);
  };

  const handleVerificationMethodSelect = (method) => {
    setSelectedVerificationMethod(method);
  };

  const handleVerificationMethodNext = () => {
    if (!selectedVerificationMethod) {
      Alert.alert('알림', '학생 인증 방식을 선택해주세요.');
      return;
    }

    setRecognizedData(null);
    setCurrentStep(verificationStep);
  };

  // 3단계 완료 (자동 인식)
  const handleStudentVerificationNext = (data) => {
    setRecognizedData(data);
    setCurrentStep(finalStep);
  };

  // 3단계 직접 입력하기
  const handleManualInput = () => {
    setRecognizedData(null);
    setCurrentStep(finalStep);
  };

  const handleCertificateSubmit = () => {
    if (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) {
      Alert.alert('알림', '증명서 URL과 접수 번호를 모두 입력해주세요.');
      return;
    }

    setCompleteModalType('certificate');
    setShowCompleteModal(true);
  };

  // 4단계 완료 (회원가입 완료)
  const handleComplete = async () => {
    const finalData = { ...formData, ...step4Data };

    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      if (!finalData.username || !finalData.password || !finalData.name) {
        Alert.alert('알림', '1단계 정보를 모두 입력해주세요.');
        return;
      }

      if (!finalData.phoneNumber || !step1Data.isVerified) {
        Alert.alert('알림', '본인인증을 완료해주세요.');
        return;
      }
      if (!isOver14Flow && !guardianStepData.guardianIsVerified) {
        Alert.alert('알림', '보호자 본인인증을 완료해주세요.');
        return;
      }

      if (!finalData.birthDate) {
        Alert.alert('알림', '생년월일을 선택해주세요.');
        return;
      }
    } else {
      // 재디자인 모드에서는 서버 요청 없이 흐름 확인만 가능하도록 처리
      setCompleteModalType('signup');
      setShowCompleteModal(true);
      return;
    }

    try {
      const payload = {
        username: finalData.username,
        password: finalData.password,
        name: finalData.name,
        phone: finalData.phoneNumber,
        birthDate: finalData.birthDate,
        // TODO: 실제 학교/컬러 선택 화면과 연동 필요
        schoolId: 1,
        grade: Number(finalData.grade) || 1,
        classNumber: Number(finalData.classNum) || 1,
        graduationYear:
          finalData.graduationYear ||
          (recognizedData?.graduationYear
            ? String(recognizedData.graduationYear)
            : String(new Date().getFullYear() + 1)),
        colorId: 1,
      };

      const response = await api.post('/api/auth/signup', payload);
      console.log('회원가입 완료:', response.data);
      setCompleteModalType('signup');
      setShowCompleteModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    }
  };

  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    setShowCompleteModal(false);
    // 회원가입 완료 후에는 로그인 화면만 남도록 스택을 초기화
    resetTo('Login');
  };

  // 단계별 제목
  const getStepTitle = () => {
    if (isOver14Flow) {
      switch (currentStep) {
        case 0:
          return '회원가입';
        case 1:
          return '개인정보 및 약관 동의';
        case 2:
          return '본인 인증';
        case 3:
          return '정보 입력';
        case 4:
          return '학생 인증 방식 선택';
        case 5:
          return '학생 인증';
        case 6:
          return selectedVerificationMethod === 'certificate' ? '증명서 제출 정보' : '학생 인증';
        default:
          return '회원가입';
      }
    }

    switch (currentStep) {
      case 0:
        return '회원가입';
      case 1:
        return '개인정보 및 약관 동의';
      case 2:
        return '본인 인증';
      case 3:
        return '보호자 본인 인증';
      case 4:
        return '정보 입력';
      case 5:
        return '학생 인증 방식 선택';
      case 6:
        return '학생 인증';
      case 7:
        return selectedVerificationMethod === 'certificate' ? '증명서 제출 정보' : '학생 인증';
      default:
        return '회원가입';
    }
  };

  // 단계별 설명
  const getStepDescription = () => {
    if (isOver14Flow) {
      switch (currentStep) {
        case 0:
          return '만 14세 이상 여부를 먼저 선택해주세요.';
        case 1:
          return '서비스 이용을 위한 동의 항목을 확인해주세요.';
        case 2:
          return 'PASS 인증을 통해 본인확인을 진행합니다.';
        case 3:
          return '이름/생년월일은 자동 입력되며 수정할 수 없습니다.';
        case 4:
          return '학생증 인증 또는 증명서 제출 중 하나를 선택해주세요.';
        case 5:
          return selectedVerificationMethod === 'certificate'
            ? '학생증이 없는 학교만 졸업(예정)증명서를 제출해주세요.'
            : '학생증과 해당 정보가 일치하는지 확인해주세요';
        case 6:
          return selectedVerificationMethod === 'certificate'
            ? '보관함 URL과 접수 번호를 입력한 뒤 제출해주세요.'
            : '학교 정보가 정확한지 확인해주세요.';
        default:
          return '';
      }
    }

    switch (currentStep) {
      case 0:
        return '만 14세 이상 여부를 먼저 선택해주세요.';
      case 1:
        return '서비스 이용을 위한 동의 항목을 확인해주세요.';
      case 2:
        return 'PASS 인증을 통해 본인확인을 진행합니다.';
      case 3:
        return '보호자 PASS 인증을 진행합니다.';
      case 4:
        return '이름/생년월일은 자동 입력되며 수정할 수 없습니다.';
      case 5:
        return '학생증 인증 또는 증명서 제출 중 하나를 선택해주세요.';
      case 6:
        return selectedVerificationMethod === 'certificate'
          ? '학생증이 없는 학교만 졸업(예정)증명서를 제출해주세요.'
          : '학생증과 해당 정보가 일치하는지 확인해주세요';
      case 7:
        return selectedVerificationMethod === 'certificate'
          ? '보관함 URL과 접수 번호를 입력한 뒤 제출해주세요.'
          : '학교 정보가 정확한지 확인해주세요.';
      default:
        return '';
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={normalize(24)} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{getStepTitle()}</Text>
            </View>

            {/* 진행바 */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressWidth}%` }]} />
            </View>

            {/* 단계별 설명 */}
            <Text style={styles.description}>{getStepDescription()}</Text>
          </View>
        </View>

        {/* 단계별 컨텐츠 */}
        <View style={styles.contentSection}>
          {currentStep === 0 && (
            <SignStepAgeGate
              styles={styles}
              selectedAgeGroup={selectedAgeGroup}
              onSelect={handleAgeGateSelect}
            />
          )}
          {currentStep === 1 && (
            <SignStepConsent
              normalize={normalize}
              selectedAgeGroup={selectedAgeGroup}
              onChange={setConsentData}
            />
          )}
          {currentStep === 2 && (
            <SignStep1
              styles={styles}
              normalize={normalize}
              onChange={setStep1Data}
              disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
              passMode={true}
            />
          )}
          {currentStep === 3 && (
            isOver14Flow ? (
              <SignStep2
                styles={styles}
                normalize={normalize}
                verifiedName={formData.name || step1Data.name || ''}
                verifiedBirthDate={formData.birthDate || step1Data.birthDate || ''}
                onChange={setStepInfoData}
              />
            ) : (
              <SignStep1_2
                styles={styles}
                normalize={normalize}
                onChange={setGuardianStepData}
                disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
              />
            )
          )}
          {currentStep === 4 && (
            isOver14Flow ? (
              <SignStepVerificationMethod
                styles={styles}
                selectedMethod={selectedVerificationMethod}
                onSelect={handleVerificationMethodSelect}
              />
            ) : (
              <SignStep2
                styles={styles}
                normalize={normalize}
                verifiedName={formData.name || step1Data.name || ''}
                verifiedBirthDate={formData.birthDate || step1Data.birthDate || ''}
                onChange={setStepInfoData}
              />
            )
          )}
          {currentStep === 5 && (
            isOver14Flow ? (
              selectedVerificationMethod === 'certificate' ? (
                <SignStepCertificate styles={styles} />
              ) : (
                <SignStep3
                  styles={styles}
                  normalize={normalize}
                  onNext={handleStudentVerificationNext}
                  onManualInput={handleManualInput}
                />
              )
            ) : (
              <SignStepVerificationMethod
                styles={styles}
                selectedMethod={selectedVerificationMethod}
                onSelect={handleVerificationMethodSelect}
              />
            )
          )}
          {isOver14Flow && currentStep === 6 && (
            selectedVerificationMethod === 'certificate' ? (
              <SignStepNumber
                styles={styles}
                normalize={normalize}
                onChange={setStepNumberData}
              />
            ) : (
              <SignStep4
                styles={styles}
                normalize={normalize}
                recognizedData={recognizedData}
                onChange={setStep4Data}
              />
            )
          )}
          {!isOver14Flow && currentStep === 6 && (
            selectedVerificationMethod === 'certificate' ? (
              <SignStepCertificate styles={styles} />
            ) : (
              <SignStep3
                styles={styles}
                normalize={normalize}
                onNext={handleStudentVerificationNext}
                onManualInput={handleManualInput}
              />
            )
          )}
          {!isOver14Flow && currentStep === 7 && (
            selectedVerificationMethod === 'certificate' ? (
              <SignStepNumber
                styles={styles}
                normalize={normalize}
                onChange={setStepNumberData}
              />
            ) : (
              <SignStep4
                styles={styles}
                normalize={normalize}
                recognizedData={recognizedData}
                onChange={setStep4Data}
              />
            )
          )}
        </View>

        {/* 하단 고정 버튼 (3단계 제외) */}
        {!isCameraStep && (
          <View style={styles.footerSection}>
            <View style={styles.bottomButtonContainer}>
              <View style={styles.nextButtonWrapper}>
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    currentStep === 0 && !selectedAgeGroup && { backgroundColor: colors.textLight20 },
                    currentStep === 1 && !consentData.allConsented && { backgroundColor: colors.textLight20 },
                    currentStep === 4 && isOver14Flow && !selectedVerificationMethod && { backgroundColor: colors.textLight20 },
                    currentStep === 5 && !isOver14Flow && !selectedVerificationMethod && { backgroundColor: colors.textLight20 },
                    ((isOver14Flow && currentStep === 6) || (!isOver14Flow && currentStep === 7)) &&
                    selectedVerificationMethod === 'certificate' &&
                    (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) && { backgroundColor: colors.textLight20 },
                  ]}
                  activeOpacity={0.9}
                  disabled={
                    (currentStep === 0 && !selectedAgeGroup) ||
                    (currentStep === 1 && !consentData.allConsented) ||
                    (currentStep === 4 && isOver14Flow && !selectedVerificationMethod) ||
                    (currentStep === 5 && !isOver14Flow && !selectedVerificationMethod) ||
                    (((isOver14Flow && currentStep === 6) || (!isOver14Flow && currentStep === 7)) &&
                      selectedVerificationMethod === 'certificate' &&
                      (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber))
                  }
                  onPress={() => {
                    if (currentStep === 0) handleStep0Next();
                    else if (currentStep === 1) handleConsentNext();
                    else if (currentStep === 2) handleStep1Next();
                    else if (currentStep === 3) handleStep2Next();
                    else if (currentStep === 4 && isOver14Flow) handleVerificationMethodNext();
                    else if (currentStep === 4 && !isOver14Flow) handleStep3Next();
                    else if (currentStep === 5 && isOver14Flow && selectedVerificationMethod === 'certificate') {
                      handleManualInput();
                    }
                    else if (currentStep === 5 && !isOver14Flow) handleVerificationMethodNext();
                    else if (currentStep === 6 && !isOver14Flow && selectedVerificationMethod === 'certificate') {
                      handleManualInput();
                    }
                    else if ((isOver14Flow && currentStep === 6) || (!isOver14Flow && currentStep === 7)) {
                      if (selectedVerificationMethod === 'certificate') {
                        handleCertificateSubmit();
                      } else {
                        handleComplete();
                      }
                    }
                  }}
                >
                  <Text style={styles.nextButtonText}>
                    {(isOver14Flow && currentStep === 6) || (!isOver14Flow && currentStep === 7)
                      ? selectedVerificationMethod === 'certificate'
                        ? '제출하기'
                        : '회원가입'
                      : '다음 단계'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {/* 회원가입 완료 모달 */}
        <Modal
          visible={showCompleteModal}
          transparent={true}
          animationType="fade"
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.textSecondary,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              width: '85%',
              backgroundColor: colors.background,
              borderRadius: normalize(20),
              padding: normalize(25),
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: normalize(20),
                fontFamily: 'Baloo2-Bold',
                color: colors.textPrimary,
                marginBottom: normalize(10),
              }}>
                {completeModalType === 'certificate' ? '제출 성공🎉' : '회원가입 성공🎉'}
              </Text>
              <Text style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
              }}>
                {completeModalType === 'certificate'
                  ? '증명서 제출이 정상적으로 완료되었습니다.'
                  : '회원가입이 완료되었습니다!'}
              </Text>
              <Text style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: normalize(10),
              }}>
                {completeModalType === 'certificate'
                  ? '증명서 확인 후 로그인할 수 있으며, 결과는 푸시 알림으로 안내드릴게요.'
                  : '지금 바로 서비스를 이용해보세요.'}
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
                <Text style={{
                  fontSize: normalize(16),
                  fontFamily: 'Baloo2-Bold',
                  color: colors.background,
                }}>
                  로그인
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default Sign;
