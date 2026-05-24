import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// 학생 인증 단계: 학생증 촬영/인식 및 수동 입력 분기 화면
const SignStep3 = ({ styles, normalize, onNext, onManualInput }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  useEffect(() => {
    // 페이지 진입 시 바로 권한 요청
    requestPermission();
  }, []);

  // 학생증 자동 인식 시뮬레이션 (추후 OCR API 연동)
  const simulateRecognition = () => {
    setIsRecognizing(true);

    // 임시: 3초 후 자동으로 다음 단계로 (추후 실제 OCR 결과로 대체)
    setTimeout(() => {
      const recognizedData = {
        name: '홍길동',
        school: '오이고등학교',
        grade: '3',
        class: '2',
        graduationYear: '2026',
      };
      setIsRecognizing(false);
      onNext(recognizedData);
    }, 3000);
  };

  if (!permission || !permission.granted) {
    return <View style={styles.content}></View>;
  }

  return (
    <View style={styles.content}>
      {/* 카메라 영역 */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          ref={(ref) => setCameraRef(ref)}
          onCameraReady={simulateRecognition}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.cardFrame} />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.cameraGuideText}>
                {isRecognizing
                  ? '학생증을 인식중입니다...'
                  : '학생증을 틀에 맞춰주세요'}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* 직접 입력하기 버튼 */}
      <TouchableOpacity style={styles.manualButton} onPress={onManualInput}>
        <Text style={styles.manualButtonText}>직접 입력하기</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignStep3;
