import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createLoginStyles } from '../../../styles/login.style';
import { api } from '../../../utils/api';
import { appAlert } from '../../../utils/appAlert';
import {
  cropRectToNormalized,
  getStudentIdFrameSize,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';
import StudentIdCaptureStage, {
  useStudentIdCapture,
} from '../../../components/auth/StudentIdCaptureStage';
import { useAuth } from '../../../context/AuthContext';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';

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
  const normalize = useMemo(() => getNormalize(width), [width]);
  const loginStyles = useMemo(
    () => createLoginStyles(width, normalize),
    [width, normalize],
  );
  const fieldStyles = useMemo(() => makeFieldStyles(normalize), [normalize]);
  const padX = width * 0.04;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef } =
    useStudentIdCapture(cameraRef);
  const [busy, setBusy] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [statusText, setStatusText] = useState('');

  const onStageLayout = useCallback(
    (e) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      if (w > 0 && h > 0) {
        previewLayoutRef.current = { width: w, height: h };
      }
    },
    [previewLayoutRef],
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
      appAlert.alert(
        '알림',
        '카메라가 준비되는 중입니다. 잠시 후 다시 시도해 주세요.',
      );
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
      if (!lastPhotoRef.current) {
        setStatusText('');
      }
    }
  }, [
    busy,
    capture,
    isReverification,
    lastPhotoRef,
    navigation,
    previewLayoutRef,
    refreshStudentVerification,
    resetCapture,
    selectedSchool,
  ]);

  if (!permission) {
    return (
      <SafeAreaView style={[localStyles.root, { paddingHorizontal: padX }]}>
        <View style={localStyles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[localStyles.root, { paddingHorizontal: padX }]}>
        <Text style={localStyles.permLabel}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity
          style={loginStyles.manualButton}
          onPress={requestPermission}
        >
          <Text style={loginStyles.manualButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[localStyles.root, { paddingHorizontal: padX }]}
      edges={['top', 'bottom']}
    >
      <View style={localStyles.header}>
        <TouchableOpacity
          onPress={() => {
            if (busy) return;
            navigation.goBack();
          }}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={normalize(24)}
            color={busy ? colors.textSecondary : colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[localStyles.headerTitle, { fontSize: normalize(18) }]}>
          {isReverification ? '학생증 재인증' : '학생증 제출하기'}
        </Text>
        <View style={{ width: normalize(24) }} />
      </View>

      <View style={localStyles.body}>
        {isReverification ? (
          <View style={localStyles.schoolBlock}>
            <Text style={localStyles.schoolHint}>
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

        <SignupHelperText
          normalize={normalize}
          variant="emphasis"
          style={localStyles.helper}
        >
          학교명과 이름이 선명하게 보이도록 촬영해 주세요. 흐리거나 잘리면 승인되지
          않을 수 있어요.
        </SignupHelperText>

        <View style={localStyles.cameraWrap} onLayout={onStageLayout}>
          <StudentIdCaptureStage
            cameraRef={cameraRef}
            frozenUri={frozenUri}
            statusText={statusText}
            guideTextStyle={loginStyles.cameraGuideText}
            stageStyle={localStyles.cameraStage}
            previewLayoutRef={previewLayoutRef}
            onStageLayout={({ width: w, height: h }) => {
              previewLayoutRef.current = { width: w, height: h };
            }}
          />
        </View>

        {frozenUri ? (
          <TouchableOpacity
            style={localStyles.retakeLink}
            onPress={resetCapture}
            disabled={busy}
          >
            <Text style={localStyles.retakeLinkText}>다시 촬영하기</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={localStyles.footer}>
        <TouchableOpacity
          style={[
            localStyles.submitBtn,
            { borderRadius: normalize(24), paddingVertical: normalize(14) },
            busy && { opacity: 0.6 },
          ]}
          activeOpacity={0.9}
          disabled={busy}
          onPress={runResubmit}
        >
          {busy ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={[
                localStyles.submitBtnText,
                { fontSize: normalize(fontSizes.xxl) },
              ]}
            >
              {frozenUri ? '제출하기' : '촬영 및 제출하기'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <SubmittingLockModal visible={busy} message="학생증 제출 중…" />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  schoolBlock: {
    width: '100%',
    marginBottom: 12,
    flexShrink: 0,
  },
  schoolHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  helper: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
    marginBottom: 10,
  },
  cameraWrap: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraStage: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    backgroundColor: '#000',
  },
  retakeLink: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
    flexShrink: 0,
  },
  retakeLinkText: {
    fontFamily: fonts.bold,
    color: colors.primary,
    fontSize: 14,
  },
  footer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 12,
    flexShrink: 0,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    color: colors.textWhite,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
});

export default StudentIdResubmit;
