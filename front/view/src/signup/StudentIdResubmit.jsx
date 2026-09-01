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
      appAlert.alert('?Œë¦¼', '?¬í•´ ?¬í•™ ì¤‘ì¸ ?™êµë¥?ê²€?‰í•´ ? íƒ??ì£¼ì„¸??');
      return;
    }

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      appAlert.alert(
        '?Œë¦¼',
        'ì¹´ë©”?¼ê? ì¤€ë¹„ë˜??ì¤‘ì…?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??',
      );
      return;
    }

    setBusy(true);
    setStatusText('?™ìƒì¦ì„ ?…ë¡œ?œí•˜??ì¤‘â€?);
    try {
      let photo = lastPhotoRef.current;
      if (!photo) {
        photo = await capture();
      }

      if (!photo?.base64) {
        appAlert.alert('ì´¬ì˜ ?¤íŒ¨', '?¤ì‹œ ì´¬ì˜??ì£¼ì„¸??');
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
        '?œì¶œ ?„ë£Œ',
        res.data?.message ||
          (isReverification
            ? '?¬ì¸ì¦??™ìƒì¦ì´ ?œì¶œ?˜ì—ˆ?µë‹ˆ?? ê²€?˜ê? ?„ë£Œ???Œê¹Œì§€ ?±ì„ ?´ìš©?????ˆìŠµ?ˆë‹¤.'
            : '?™ìƒì¦ì´ ?¬ì œì¶œë˜?ˆìŠµ?ˆë‹¤. ê´€ë¦¬ì ?¹ì¸??ê¸°ë‹¤??ì£¼ì„¸??'),
      );
      navigation.goBack();
    } catch (e) {
      resetCapture();
      appAlert.alert(
        '?œì¶œ ?¤íŒ¨',
        e?.response?.data?.message || '?™ìƒì¦??¬ì œì¶?ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
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
        <Text style={localStyles.permLabel}>ì¹´ë©”??ê¶Œí•œ???„ìš”?©ë‹ˆ??</Text>
        <TouchableOpacity
          style={loginStyles.manualButton}
          onPress={requestPermission}
        >
          <Text style={loginStyles.manualButtonText}>ê¶Œí•œ ?ˆìš©?˜ê¸°</Text>
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
          {isReverification ? '?™ìƒì¦??¬ì¸ì¦? : '?™ìƒì¦??œì¶œ?˜ê¸°'}
        </Text>
        <View style={{ width: normalize(24) }} />
      </View>

      <View style={localStyles.body}>
        {isReverification ? (
          <View style={localStyles.schoolBlock}>
            <Text style={localStyles.schoolHint}>
              ì¤‘í•™êµì—??ê³ ë“±?™êµë¡?ì§„í•™??ê²½ìš°, ?¬í•´ ?¬í•™ ì¤‘ì¸ ê³ ë“±?™êµë¥?ê²€?‰í•´
              ? íƒ??ì£¼ì„¸??
            </Text>
            <SchoolSearchField
              styles={fieldStyles}
              normalize={normalize}
              selectedSchool={selectedSchool}
              onSelect={setSelectedSchool}
              label="?¬í•´ ?¬í•™ ì¤‘ì¸ ?™êµ"
            />
          </View>
        ) : null}

        <SignupHelperText
          normalize={normalize}
          variant="emphasis"
          style={localStyles.helper}
        >
          ?™êµëª…ê³¼ ?´ë¦„??? ëª…?˜ê²Œ ë³´ì´?„ë¡ ì´¬ì˜??ì£¼ì„¸?? ?ë¦¬ê±°ë‚˜ ?˜ë¦¬ë©??¹ì¸?˜ì?
          ?Šì„ ???ˆì–´??
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
            <Text style={localStyles.retakeLinkText}>?¤ì‹œ ì´¬ì˜?˜ê¸°</Text>
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
              {frozenUri ? '?œì¶œ?˜ê¸°' : 'ì´¬ì˜ ë°??œì¶œ?˜ê¸°'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <SubmittingLockModal visible={busy} message="?™ìƒì¦??œì¶œ ì¤‘â€? />
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
