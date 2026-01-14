import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import SignStep1 from './signup/SignStep1';
import SignStep2 from './signup/SignStep2';
import SignStep3 from './signup/SignStep3';
import SignStep4 from './signup/SignStep4';

const Sign = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [recognizedData, setRecognizedData] = useState(null);

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
  const handleStep1Next = (data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  // 2단계 완료
  const handleStep2Next = (data) => {
    setFormData({ ...formData, ...data });
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
  const handleComplete = (data) => {
    const finalData = { ...formData, ...data };
    console.log('회원가입 완료:', finalData);
    // 추후 회원가입 API 호출
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

  return (
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
      </View>

      {/* 단계별 컨텐츠 */}
      {currentStep === 1 && (
        <SignStep1 styles={styles} normalize={normalize} onNext={handleStep1Next} />
      )}
      {currentStep === 2 && (
        <SignStep2 styles={styles} normalize={normalize} onNext={handleStep2Next} />
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
          onComplete={handleComplete}
          recognizedData={recognizedData}
        />
      )}
    </SafeAreaView>
  );
};

export default Sign;
