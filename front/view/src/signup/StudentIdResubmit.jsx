import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { api } from '../../../utils/api';
import { appAlert } from '../../../utils/appAlert';
import SchoolSearchField, { GrowingUnderline } from './SchoolSearchField';
import SubHeader from '../../frame/subHeader';
import { useAuth } from '../../../context/AuthContext';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import StudentIdPhotoAttachFields from './StudentIdPhotoAttachFields';
import SignupPrepMaterialsModal from './SignupPrepMaterialsModal';

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
 * @param {{ mode?: 'rejected'|'reverification'|'verify', navigation: { goBack: () => void }, route?: { params?: { mode?: string, skipPrep?: boolean } } }} props
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
  const fieldStyles = useMemo(() => makeFieldStyles(normalize), [normalize]);
  const enrollmentStyles = useMemo(
    () => createEnrollmentStyles(normalize),
    [normalize],
  );
  const localStyles = useMemo(() => createLocalStyles(normalize), [normalize]);
  const headerTitle = isReverification
    ? '학생증 재인증'
    : isFirstVerify
      ? '학생증 인증'
      : '학생증 재제출';

  const [prepVisible, setPrepVisible] = useState(
    () => !route?.params?.skipPrep,
  );
  const [busy, setBusy] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolGradeNum, setSchoolGradeNum] = useState('');
  const [schoolClassNum, setSchoolClassNum] = useState('');
  const [schoolSearchActive, setSchoolSearchActive] = useState(false);
  const [primaryUri, setPrimaryUri] = useState(null);
  const [primaryBase64, setPrimaryBase64] = useState(null);
  const [primaryAspect, setPrimaryAspect] = useState(1);
  const [secondaryUri, setSecondaryUri] = useState(null);
  const [secondaryBase64, setSecondaryBase64] = useState(null);
  const [secondaryAspect, setSecondaryAspect] = useState(1);

  const handleBack = () => {
    if (busy) return;
    navigation.goBack();
  };

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

  const schoolReady = Boolean(selectedSchool?.id);
  const gradeReady =
    Number.isFinite(Number(schoolGradeNum)) && Number(schoolGradeNum) >= 1;
  const classReady =
    Number.isFinite(Number(schoolClassNum)) && Number(schoolClassNum) >= 1;
  const enrollmentReady = schoolReady && gradeReady && classReady;
  const submitDisabled = busy || !enrollmentReady || !primaryBase64;

  const runResubmit = useCallback(async () => {
    if (busy) return;
    if (!selectedSchool?.id) {
      appAlert.alert('알림', '재학 중인 학교를 검색해 선택해 주세요.');
      return;
    }
    if (!gradeReady) {
      appAlert.alert('알림', '학년을 입력해 주세요.');
      return;
    }
    if (!classReady) {
      appAlert.alert('알림', '반을 입력해 주세요.');
      return;
    }
    if (!primaryBase64) {
      appAlert.alert('알림', '학생증 사진을 첨부해 주세요.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        imageBase64: primaryBase64,
        schoolId: selectedSchool.id,
        grade: Number(schoolGradeNum),
        classNumber: Number(schoolClassNum),
      };
      if (secondaryBase64) {
        payload.imageBase64Secondary = secondaryBase64;
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
      appAlert.alert(
        '제출 실패',
        e?.response?.data?.message || '학생증 제출 중 오류가 발생했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    classReady,
    gradeReady,
    isFirstVerify,
    isReverification,
    navigation,
    primaryBase64,
    refreshStudentVerification,
    schoolClassNum,
    schoolGradeNum,
    secondaryBase64,
    selectedSchool,
  ]);

  return (
    <SafeAreaView style={localStyles.root} edges={['top', 'bottom']}>
      <SubHeader title={headerTitle} onBack={handleBack} />

      <ScrollView
        style={localStyles.scroll}
        contentContainerStyle={[
          localStyles.scrollContent,
          { paddingHorizontal: width * 0.07 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
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

        <StudentIdPhotoAttachFields
          normalize={normalize}
          busy={busy}
          primaryUri={primaryUri}
          primaryAspect={primaryAspect}
          secondaryUri={secondaryUri}
          secondaryAspect={secondaryAspect}
          onPrimaryPicked={({ uri, base64, aspect }) => {
            setPrimaryUri(uri);
            setPrimaryBase64(base64);
            setPrimaryAspect(aspect);
          }}
          onSecondaryPicked={({ uri, base64, aspect }) => {
            setSecondaryUri(uri);
            setSecondaryBase64(base64);
            setSecondaryAspect(aspect);
          }}
          onClearPrimary={() => {
            setPrimaryUri(null);
            setPrimaryBase64(null);
            setPrimaryAspect(1);
          }}
          onClearSecondary={() => {
            setSecondaryUri(null);
            setSecondaryBase64(null);
            setSecondaryAspect(1);
          }}
        />
      </ScrollView>

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
              제출하기
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <SubmittingLockModal visible={busy} message="학생증 제출 중…" />

      <SignupPrepMaterialsModal
        visible={prepVisible}
        variant="verify"
        normalize={normalize}
        onConfirm={() => setPrepVisible(false)}
        onCancel={() => {
          setPrepVisible(false);
          navigation.goBack();
        }}
      />
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

function createLocalStyles(normalize) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      minHeight: 0,
    },
    scrollContent: {
      paddingTop: normalize(12),
      paddingBottom: normalize(24),
      gap: normalize(20),
    },
    schoolBlock: {
      zIndex: 2,
    },
    footer: {
      paddingTop: normalize(8),
      paddingBottom: normalize(12),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.45,
    },
    submitBtnText: {
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
  });
}

export default StudentIdResubmit;
