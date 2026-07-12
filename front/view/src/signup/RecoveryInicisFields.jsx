import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  InteractionManager,
} from 'react-native';
import { colors } from '../../../styles/colors';
import {
  runInicisIdentityFlow,
  cancelInicisFlow,
  clearPendingInicisSession,
  dismissInicisBrowserSafely,
  openPendingInicisBrowser,
  fetchInicisServerEnabled,
  isInicisClientEnabled,
  waitForPresentationLayerRelease,
} from '../../../services/inicisAuth';
import SignupIdentityVerifyingOverlay from './SignupIdentityVerifyingOverlay';

/**
 * 아이디/비밀번호 찾기 — KG 이니시스 본인인증
 * @param {'find_username'|'password_recovery'} purpose
 */
const RecoveryInicisFields = ({
  styles,
  normalize,
  purpose,
  name,
  username,
  isVerified,
  verifiedProfile,
  onVerified,
  disabled = false,
}) => {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [manualOpening, setManualOpening] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isMountedRef = useRef(true);
  const flowActiveRef = useRef(false);

  const endOverlay = useCallback(async () => {
    await dismissInicisBrowserSafely();
    flowActiveRef.current = false;
    if (isMountedRef.current) {
      setOverlayVisible(false);
      setManualOpening(false);
    }
    await waitForPresentationLayerRelease();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelInicisFlow();
      void clearPendingInicisSession();
    };
  }, []);

  const resetVerified = useCallback(() => {
    onVerified?.({
      isVerified: false,
      inicisClientToken: null,
      profile: null,
    });
  }, [onVerified]);

  const handleOverlayCancel = useCallback(async () => {
    cancelInicisFlow();
    await endOverlay();
    await clearPendingInicisSession();
  }, [endOverlay]);

  const handleOverlayOpenManually = useCallback(async () => {
    if (manualOpening) return;
    setManualOpening(true);
    try {
      await openPendingInicisBrowser();
    } catch (error) {
      Alert.alert(
        '알림',
        error?.message || '인증 페이지를 열 수 없습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      await dismissInicisBrowserSafely();
      if (isMountedRef.current) {
        setManualOpening(false);
      }
    }
  }, [manualOpening]);

  const runVerification = useCallback(async () => {
    if (flowActiveRef.current || verifying || isVerified || disabled) return;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (purpose === 'password_recovery' && !String(username || '').trim()) {
      Alert.alert('알림', '아이디를 입력해 주세요.');
      return;
    }

    const clientOn = isInicisClientEnabled();
    if (!clientOn) {
      Alert.alert('알림', '본인인증 기능이 비활성화되어 있습니다.');
      return;
    }
    const serverOn = await fetchInicisServerEnabled();
    if (!serverOn) {
      Alert.alert('알림', '본인인증 서비스를 이용할 수 없습니다.');
      return;
    }

    flowActiveRef.current = true;
    setVerifying(true);
    setOverlayVisible(true);

    let result = null;
    try {
      result = await runInicisIdentityFlow(purpose);
    } catch (error) {
      if (error?.code !== 'CANCELLED') {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            if (!isMountedRef.current) return;
            if (error?.code === 'TIMEOUT') {
              Alert.alert(
                '본인인증 미완료',
                '본인인증이 완료되지 않았습니다. 다시 시도해 주세요.',
              );
              return;
            }
            Alert.alert(
              '본인인증 오류',
              error?.message || '본인인증을 진행할 수 없습니다.',
            );
          }, 280);
        });
      }
    } finally {
      await endOverlay();
      if (isMountedRef.current) {
        setVerifying(false);
      }
    }

    if (!result?.clientToken) return;

    const profile = result.profile || {};
    const verifiedName = String(profile.name || '').trim();
    if (!verifiedName) {
      Alert.alert(
        '본인인증 오류',
        '인증 결과에서 이름을 확인하지 못했습니다. 다시 시도해 주세요.',
      );
      return;
    }

    onVerified?.({
      isVerified: true,
      inicisClientToken: result.clientToken,
      profile: {
        name: verifiedName,
        phoneNumber: profile.phoneNumber || profile.phone || '',
      },
    });
  }, [
    disabled,
    endOverlay,
    isVerified,
    name,
    onVerified,
    purpose,
    username,
    verifying,
  ]);

  return (
    <>
      <Text style={styles.inputLabel}>본인인증</Text>
      <View style={styles.inputWrapper}>
        {isVerified ? (
          <View style={[styles.input, styles.inputReadonly]}>
            <Text
              style={{
                fontSize: normalize(15),
                color: colors.textPrimary,
                textAlign: 'center',
              }}
            >
              본인인증이 완료되었습니다.
              {verifiedProfile?.name ? ` (${verifiedProfile.name})` : ''}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.verifyButton,
              styles.verifyButtonWide,
              (disabled || verifying) && { opacity: 0.6 },
            ]}
            activeOpacity={0.9}
            disabled={disabled || verifying}
            onPress={runVerification}
          >
            <Text style={styles.verifyButtonText}>
              {verifying ? '인증 진행 중...' : 'KG 이니시스 본인인증'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isVerified ? (
        <TouchableOpacity onPress={resetVerified} activeOpacity={0.8}>
          <Text style={styles.verifiedHint}>다시 인증하기</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.verifiedHint}>
          가입 시 등록한 명의의 휴대폰으로 본인인증을 진행해 주세요.
        </Text>
      )}

      <SignupIdentityVerifyingOverlay
        visible={overlayVisible}
        title="본인인증 진행 중"
        normalize={normalize}
        onOpenManually={handleOverlayOpenManually}
        onCancel={handleOverlayCancel}
        openingManually={manualOpening}
      />
    </>
  );
};

export default RecoveryInicisFields;
