import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';
import { api } from '../../../utils/api';
import { appAlert } from '../../../utils/appAlert';
import {
  cropRectToNormalized,
  getStudentIdFrameSize,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import SchoolSearchField from './SchoolSearchField';
import StudentIdCaptureStage, {
  useStudentIdCapture,
} from '../../../components/auth/StudentIdCaptureStage';
import { useAuth } from '../../../context/AuthContext';

const UPLOAD_TIMEOUT_MS = 120_000;

const makeFieldStyles = (normalize) =>
  StyleSheet.create({
    inputLabel: {
      fontFamily: fonts.regular,
      fontSize: normalize(14),
      color: colors.textPrimary,
      marginBottom: normalize(6),
    },
    inputWrapper: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(12),
      backgroundColor: colors.background,
    },
    input: {
      fontFamily: fonts.regular,
      fontSize: normalize(15),
      color: colors.textPrimary,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
    },
  });

/**
 * @param {{ mode?: 'rejected'|'reverification', navigation: { goBack: () => void } }} props
 */
const StudentIdResubmit = ({ mode = 'rejected', navigation }) => {
  const isReverification = mode === 'reverification';
  const { refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const fieldStyles = useMemo(() => makeFieldStyles(normalize), [normalize]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef } =
    useStudentIdCapture(cameraRef);
  const [busy, setBusy] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [statusText, setStatusText] = useState(
    '학생증을 가운데 틀에 맞춘 뒤 촬영해 주세요.',
  );

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!isReverification) return;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const school = res.data?.data?.school;
        if (school?.id) {
          setSelectedSchool({
            id: school.id,
            name: school.name || '',
          });
        }
      } catch {
        // ignore
      }
    })();
  }, [isReverification]);

  const runResubmit = useCallback(async () => {
    if (busy) return;
    if (isReverification && !selectedSchool?.id) {
      appAlert.alert('알림', '올해 재학 중인 학교를 검색해 선택해 주세요.');
      return;
    }

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      appAlert.alert('알림', '카메라가 준비되는 중입니다.');
      return;
    }

    setBusy(true);
    setStatusText('학생증을 업로드하는 중…');
    try {
      let photo = lastPhotoRef.current;
      if (!photo) {
        photo = await capture();
      }

      if (!photo?.base64) {
        appAlert.alert('촬영 실패', '다시 촬영해 주세요.');
        resetCapture();
        return;
      }

      const { frameWidth, frameHeight } = getStudentIdFrameSize(preview.width);
      const cropRect = resolveStudentIdCropRect({
        photoWidth: photo.width,
        photoHeight: photo.height,
        previewWidth: preview.width,
        previewHeight: preview.height,
        frameWidth,
        frameHeight,
      });
      const cropRegion =
        cropRect && photo.width && photo.height
          ? cropRectToNormalized(cropRect, photo.width, photo.height)
          : null;

      const payload = {
        imageBase64: photo.base64,
        cropRegion,
      };
      if (isReverification && selectedSchool?.id) {
        payload.schoolId = selectedSchool.id;
      }

      const res = await api.post('/api/auth/resubmit-student-id', payload, {
        timeout: UPLOAD_TIMEOUT_MS,
      });

      await refreshStudentVerification();
      appAlert.alert(
        '제출 완료',
        res.data?.message ||
          (isReverification
            ? '재인증 학생증이 제출되었습니다. 검수가 완료될 때까지 앱을 이용할 수 있습니다.'
            : '학생증이 재제출되었습니다. 관리자 승인을 기다려 주세요.'),
      );
      navigation.goBack();
    } catch (e) {
      resetCapture();
      appAlert.alert(
        '제출 실패',
        e?.response?.data?.message || '학생증 재제출 중 오류가 발생했습니다.',
      );
    } finally {
      setBusy(false);
      setStatusText('학생증을 가운데 틀에 맞춰 주세요.');
    }
  }, [
    busy,
    capture,
    frozenUri,
    isReverification,
    lastPhotoRef,
    navigation,
    previewLayoutRef,
    refreshStudentVerification,
    resetCapture,
    selectedSchool,
  ]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.label}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>권한 허용하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isReverification ? '학생증 재인증' : '학생증 재제출'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isReverification ? (
          <View style={styles.schoolBlock}>
            <Text style={styles.schoolHint}>
              중학교에서 고등학교로 진학한 경우, 올해 재학 중인 고등학교를 검색해
              선택해 주세요.
            </Text>
            <SchoolSearchField
              styles={fieldStyles}
              normalize={normalize}
              selectedSchool={selectedSchool}
              onSelect={setSelectedSchool}
              label="올해 재학 중인 학교"
            />
          </View>
        ) : null}

        <StudentIdCaptureStage
          cameraRef={cameraRef}
          frozenUri={frozenUri}
          statusText={statusText}
          guideTextStyle={styles.guideText}
          stageStyle={styles.cameraStage}
          previewLayoutRef={previewLayoutRef}
        />

        {frozenUri ? (
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={resetCapture}
            disabled={busy}
          >
            <Text style={styles.retakeBtnText}>다시 촬영하기</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitBtn, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={runResubmit}
      >
        {busy ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitBtnText}>
            {frozenUri ? '제출하기' : '촬영 및 제출하기'}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Baloo2-Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 12 },
  schoolBlock: { marginBottom: 12 },
  schoolHint: {
    fontFamily: 'Baloo2-Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  cameraStage: {
    minHeight: 300,
    marginTop: 4,
  },
  guideText: {
    color: '#fff',
    fontFamily: 'Baloo2-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  retakeBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retakeBtnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.primary,
    fontSize: 14,
  },
  submitBtn: {
    margin: 16,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
    fontSize: 16,
  },
  label: {
    fontFamily: 'Baloo2-Regular',
    fontSize: 15,
    color: colors.textPrimary,
    margin: 24,
  },
  btn: {
    marginHorizontal: 24,
    padding: 14,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
  },
});

export default StudentIdResubmit;
