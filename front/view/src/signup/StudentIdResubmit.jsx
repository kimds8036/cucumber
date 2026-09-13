import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
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
import SchoolSearchField, { GrowingUnderline } from './SchoolSearchField';
import SubHeader from '../../frame/subHeader';
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

function resolveStudentIdMode(explicitMode, status) {
  if (
    explicitMode === 'verify' ||
    explicitMode === 'rejected' ||
    explicitMode === 'reverification'
  ) {
    return explicitMode;
  }
  if (status === 'REJECTED') return 'rejected';
  if (status === 'APPROVED') return 'reverification';
  return 'verify';
}

/**
 * @param {{ mode?: 'rejected'|'reverification'|'verify', navigation: { goBack: () => void }, route?: { params?: { mode?: string } } }} props
 */
const StudentIdResubmit = ({ mode: modeProp, navigation, route }) => {
  const { refreshStudentVerification, studentVerificationStatus } = useAuth();
  const mode = resolveStudentIdMode(
    modeProp || route?.params?.mode,
    studentVerificationStatus,
  );
  const isReverification = mode === 'reverification';
  const isFirstVerify = mode === 'verify';
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const loginStyles = useMemo(
    () => createLoginStyles(width, normalize),
    [width, normalize],
  );
  const fieldStyles = useMemo(() => makeFieldStyles(normalize), [normalize]);
  const enrollmentStyles = useMemo(
    () => createEnrollmentStyles(normalize),
    [normalize],
  );
  const headerTitle = isReverification
    ? '학생증 재인증'
    : isFirstVerify
      ? '학생증 인증'
      : '학생증 재제출';

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef } =
    useStudentIdCapture(cameraRef);
  const [busy, setBusy] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolGradeNum, setSchoolGradeNum] = useState('');
  const [schoolClassNum, setSchoolClassNum] = useState('');
  const [statusText, setStatusText] = useState('');
  const [schoolSearchActive, setSchoolSearchActive] = useState(false);

  const handleBack = () => {
    if (busy) return;
    navigation.goBack();
  };

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
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const me = res.data?.data;
        const school = me?.school;
        if (school?.id) {
          setSelectedSchool({
            id: school.id,
            name: school.name || '',
          });
        }
        if (me?.grade != null && me.grade !== '') {
          setSchoolGradeNum(String(me.grade));
        }
        if (me?.classNumber != null && me.classNumber !== '') {
          setSchoolClassNum(String(me.classNumber));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const schoolRequired = true; // 인증·재제출·재인증 모두 학교·학년·반 확인
  const schoolReady = Boolean(selectedSchool?.id);
  const gradeReady =
    Number.isFinite(Number(schoolGradeNum)) && Number(schoolGradeNum) >= 1;
  const classReady =
    Number.isFinite(Number(schoolClassNum)) && Number(schoolClassNum) >= 1;
  const enrollmentReady =
    !schoolRequired || (schoolReady && gradeReady && classReady);
  const submitDisabled = busy || !enrollmentReady;

  const runResubmit = useCallback(async () => {
    if (busy) return;
    if (schoolRequired && !selectedSchool?.id) {
      appAlert.alert('알림', '재학 중인 학교를 검색해 선택해 주세요.');
      return;
    }
    if (schoolRequired && !gradeReady) {
      appAlert.alert('알림', '학년을 입력해 주세요.');
      return;
    }
    if (schoolRequired && !classReady) {
      appAlert.alert('알림', '반을 입력해 주세요.');
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
      if (schoolRequired && selectedSchool?.id) {
        payload.schoolId = selectedSchool.id;
        payload.grade = Number(schoolGradeNum);
        payload.classNumber = Number(schoolClassNum);
      }

      const res = await api.post('/api/auth/resubmit-student-id', payload, {
        timeout: UPLOAD_TIMEOUT_MS,
      });

      await refreshStudentVerification();
      appAlert.alert(
        '제출 완료',
        res.data?.message ||
          (isReverification
            ? '확인용 학생증이 제출되었습니다. 검토가 완료될 때까지 일부 기능을 사용할 수 없습니다.'
            : isFirstVerify
              ? '학생증이 제출되었습니다. 관리자 승인을 기다려 주세요.'
              : '학생증이 재제출되었습니다. 관리자 승인을 기다려 주세요.'),
      );
      navigation.goBack();
    } catch (e) {
      resetCapture();
      appAlert.alert(
        '제출 실패',
        e?.response?.data?.message || '학생증 제출 중 오류가 발생했습니다.',
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
    classReady,
    gradeReady,
    isFirstVerify,
    isReverification,
    lastPhotoRef,
    navigation,
    previewLayoutRef,
    refreshStudentVerification,
    resetCapture,
    schoolClassNum,
    schoolGradeNum,
    schoolRequired,
    selectedSchool,
  ]);

  if (!permission) {
    return (
      <SafeAreaView style={localStyles.root} edges={['top', 'bottom']}>
        <SubHeader title={headerTitle} onBack={handleBack} />
        <View
          style={[
            localStyles.body,
            localStyles.centered,
            { paddingHorizontal: width * 0.07 },
          ]}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={localStyles.root} edges={['top', 'bottom']}>
        <SubHeader title={headerTitle} onBack={handleBack} />
        <View style={[localStyles.body, { paddingHorizontal: width * 0.07 }]}>
          <Text style={localStyles.permLabel}>카메라 권한이 필요합니다.</Text>
          <TouchableOpacity
            style={loginStyles.manualButton}
            onPress={requestPermission}
          >
            <Text style={loginStyles.manualButtonText}>권한 허용하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={localStyles.root} edges={['top', 'bottom']}>
      <SubHeader title={headerTitle} onBack={handleBack} />

      <View style={[localStyles.body, { paddingHorizontal: width * 0.07 }]}>
        {schoolRequired ? (
          <View style={localStyles.schoolBlock}>
            <Text style={enrollmentStyles.fieldLabel}>재학 중인 학교</Text>
            <SchoolSearchField
              styles={fieldStyles}
              normalize={normalize}
              selectedSchool={selectedSchool}
              onSelect={(school) => {
                setSelectedSchool(school);
                if (school) setSchoolSearchActive(false);
              }}
              hideLabel
              readOnly={!schoolSearchActive}
              onActivate={() => setSchoolSearchActive(true)}
              autoFocus={schoolSearchActive}
              inputVariant="underline"
              placeholder="검색하기"
              showListOnlyWithResults
              overlayDropdown
              compactSelection
              rowMarginHorizontal={0}
              showClearButton={Boolean(selectedSchool)}
              onClear={() => {
                setSelectedSchool(null);
                setSchoolSearchActive(false);
              }}
            />
            {selectedSchool && !schoolSearchActive ? (
              <View style={enrollmentStyles.gradeClassRow}>
                <View style={enrollmentStyles.gradeClassCol}>
                  <Text style={enrollmentStyles.fieldLabel}>학년</Text>
                  <View style={enrollmentStyles.underlineField}>
                    <TextInput
                      style={enrollmentStyles.fieldInput}
                      value={schoolGradeNum}
                      onChangeText={(text) =>
                        setSchoolGradeNum(text.replace(/\D/g, '').slice(0, 1))
                      }
                      keyboardType="number-pad"
                      maxLength={1}
                      placeholder=""
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="next"
                    />
                  </View>
                  <GrowingUnderline
                    active={Boolean(schoolGradeNum)}
                    normalize={normalize}
                    fillColor={colors.textLight40}
                  />
                </View>
                <View style={enrollmentStyles.gradeClassCol}>
                  <Text style={enrollmentStyles.fieldLabel}>반</Text>
                  <View style={enrollmentStyles.underlineField}>
                    <TextInput
                      style={enrollmentStyles.fieldInput}
                      value={schoolClassNum}
                      onChangeText={(text) =>
                        setSchoolClassNum(text.replace(/\D/g, '').slice(0, 2))
                      }
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder=""
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                    />
                  </View>
                  <GrowingUnderline
                    active={Boolean(schoolClassNum)}
                    normalize={normalize}
                    fillColor={colors.textLight40}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

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

      <View style={[localStyles.footer, { paddingHorizontal: width * 0.07 }]}>
        <TouchableOpacity
          style={[
            localStyles.submitBtn,
            { borderRadius: normalize(24), paddingVertical: normalize(14) },
            submitDisabled && localStyles.submitBtnDisabled,
          ]}
          activeOpacity={0.9}
          disabled={submitDisabled}
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

function createEnrollmentStyles(normalize) {
  return StyleSheet.create({
    gradeClassRow: {
      flexDirection: 'row',
      gap: normalize(20),
      marginTop: normalize(20),
    },
    gradeClassCol: {
      flex: 1,
      minWidth: 0,
    },
    fieldLabel: {
      marginBottom: normalize(6),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      letterSpacing: 0.2,
      color: colors.textLight40,
    },
    underlineField: {
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(2),
      minHeight: normalize(40),
      justifyContent: 'center',
    },
    fieldInput: {
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      minHeight: normalize(fontSizes.xxl),
      color: colors.textPrimary,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' },
        ios: {},
      }),
    },
  });
}

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
  },
  schoolBlock: {
    width: '100%',
    marginBottom: 16,
    flexShrink: 0,
    zIndex: 40,
    elevation: 40,
  },
  body: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'visible',
  },
  cameraWrap: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    zIndex: 1,
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
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    color: colors.background,
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
