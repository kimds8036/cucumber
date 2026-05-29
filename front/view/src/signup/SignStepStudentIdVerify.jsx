import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

/** 학생증 촬영 → OCR (가입 DB 기록은 마지막 POST /signup 에서만) */
const SignStepStudentIdVerify = ({ styles, identity, onVerified }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('학생증을 가운데 틀에 맞춰 주세요.');

  const runVerify = useCallback(async () => {
    if (!identity?.name?.trim() || !identity?.birthDate) {
      Alert.alert('알림', '이름·생년월일·전화번호 인증을 먼저 완료해 주세요.');
      return;
    }

    if (!cameraRef.current) return;

    setBusy(true);
    setStatusText('학생증을 인식하는 중…');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.45,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        Alert.alert('촬영 실패', '다시 촬영해 주세요.');
        return;
      }

      const res = await api.post('/api/auth/signup/verify-student-id', {
        name: identity.name.trim(),
        birthDate: identity.birthDate,
        imageBase64: photo.base64,
      });

      const data = res.data?.data;
      if (!res.data?.success || !data?.passed) {
        const reasons = (data?.reasons || []).join('\n');
        Alert.alert(
          '학생증 인증 실패',
          reasons || res.data?.message || '학생증을 다시 촬영해 주세요.',
        );
        setStatusText('인식에 실패했습니다. 다시 맞춰 주세요.');
        return;
      }

      onVerified?.({
        name: identity.name,
        school: data.school,
        schoolId: data.school?.id,
        grade: data.suggestedGrade ?? '',
        class: data.suggestedClassNumber ?? '',
        graduationYear: data.suggestedGraduationYear ?? '',
        verification: data,
      });
    } catch (e) {
      console.warn('[SignStepStudentIdVerify]', e?.response?.data || e);
      Alert.alert(
        '인증 오류',
        e?.response?.data?.message || '학생증 인증 중 오류가 발생했습니다.',
      );
      setStatusText('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      setStatusText('학생증을 가운데 틀에 맞춰 주세요.');
    }
  }, [identity, onVerified]);

  if (!permission) {
    return <View style={[styles.content, { flex: 1 }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.content, { flex: 1 }]}>
        <Text style={styles.inputLabel}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.manualButton} onPress={requestPermission}>
          <Text style={styles.manualButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={localStyles.root}>
      <View style={[styles.cameraContainer, localStyles.cameraFill]}>
        <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.cardFrame} />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.cameraGuideText}>{statusText}</Text>
            </View>
          </View>
        </CameraView>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, localStyles.captureBtn, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={runVerify}
      >
        {busy ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.nextButtonText}>촬영 및 인증하기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cameraFill: {
    flex: 1,
    minHeight: 320,
    marginBottom: 0,
  },
  captureBtn: {
    marginTop: 12,
    marginBottom: 8,
  },
});

export default SignStepStudentIdVerify;
