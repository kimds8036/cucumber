import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Keyboard, TouchableWithoutFeedback, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import SignStep1 from './signup/SignStep1';
import SignStep2 from './signup/SignStep2';
import SignStep3 from './signup/SignStep3';
import SignStep4 from './signup/SignStep4';
import { api } from '../../utils/api';

const Sign = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [recognizedData, setRecognizedData] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [step1Data, setStep1Data] = useState({});
  const [step2Data, setStep2Data] = useState({});
  const [step4Data, setStep4Data] = useState({});

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  // 진행바 애니메이션
  const progressWidth = (currentStep / 4) * 100;

  // 뒤로가기 처리
  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // 1단계 완료
  const handleStep1Next = () => {
    setFormData({ ...formData, ...step1Data });
    setCurrentStep(2);
  };

  // 2단계 완료
  const handleStep2Next = () => {
    if (!step2Data.isVerified) {
      Alert.alert('알림', '전화번호 인증을 먼저 완료해주세요.');
      return;
    }
    setFormData({ ...formData, ...step2Data });
    setCurrentStep(3);
  };

  // 3단계 완료 (자동 인식)
  const handleStep3Next = (data) => {
    setRecognizedData(data);
    setCurrentStep(4);
  };

  // 3단계 직접 입력하기
  const handleManualInput = () => {
    setRecognizedData(null);
    setCurrentStep(4);
  };

  // 4단계 완료 (회원가입 완료)
  const handleComplete = async () => {
    const finalData = { ...formData, ...step4Data };

    if (!finalData.username || !finalData.password || !finalData.name) {
      Alert.alert('알림', '1단계 정보를 모두 입력해주세요.');
      return;
    }

    if (!finalData.phoneNumber || !step2Data.isVerified) {
      Alert.alert('알림', '전화번호 인증을 완료해주세요.');
      return;
    }

    if (!finalData.birthDate) {
      Alert.alert('알림', '생년월일을 선택해주세요.');
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
    navigation.navigate('Login');
  };

  // 단계별 제목
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return '회원가입';
      case 2:
        return '본인 인증';
      case 3:
        return '학생 인증';
      case 4:
        return '학생 인증';
      default:
        return '회원가입';
    }
  };

  // 단계별 설명
  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return '회원 및 학생 인증에 필요한 중요 정보입니다.';
      case 2:
        return '사용자 확인을 위한 인증 단계입니다.';
      case 3:
        return '학교 게시판을 이용하기 위한 인증 단계입니다.';
      case 4:
        return '학생증과 해당 정보가 일치하는지 확인해주세요';
      default:
        return '';
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

        {/* 단계별 컨텐츠 */}
        {currentStep === 1 && (
          <SignStep1
            styles={styles}
            normalize={normalize}
            onChange={setStep1Data}
          />
        )}
        {currentStep === 2 && (
          <SignStep2
            styles={styles}
            normalize={normalize}
            onChange={setStep2Data}
          />
        )}
        {currentStep === 3 && (
          <SignStep3
            styles={styles}
            normalize={normalize}
            onNext={handleStep3Next}
            onManualInput={handleManualInput}
          />
        )}
        {currentStep === 4 && (
          <SignStep4
            styles={styles}
            normalize={normalize}
            recognizedData={recognizedData}
            onChange={setStep4Data}
          />
        )}

        {/* 하단 고정 버튼 (3단계 제외) */}
        {currentStep !== 3 && (
          <View style={styles.bottomButtonContainer}>
            <View style={styles.nextButtonWrapper}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => {
                  if (currentStep === 1) handleStep1Next();
                  else if (currentStep === 2) handleStep2Next();
                  else if (currentStep === 4) handleComplete();
                }}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? '회원가입' : '다음 단계'}
                </Text>
              </TouchableOpacity>
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
                회원가입 성공🎉
              </Text>
              <Text style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
              }}>
                회원가입이 완료되었습니다!
              </Text>
              <Text style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: normalize(10),
              }}>
                지금 바로 서비스를 이용해보세요.
              </Text>
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: normalize(45),
                  backgroundColor: colors.primary,
                  borderRadius: normalize(13),
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
