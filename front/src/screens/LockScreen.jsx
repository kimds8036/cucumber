import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  InteractionManager,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LogoIcon from '../../assets/Logo.svg';
import PinInput from '../../view/src/components/PinInput';
import { createLoginStyles } from '../../styles/login.style';
import { createLockStyles, getLockPinKeypadGap, getNormalize } from '../../styles/lock.style';
import { colors } from '../../styles/colors';
import { getAppLockPin, getBiometricEnabled } from '../../utils/appLockStorage';
import {
  authenticateWithBiometrics,
  checkBiometricAvailability,
} from '../../utils/biometrics';

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 30_000;

const LockScreen = ({ onUnlock }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createLockStyles(normalize), [normalize, width]);
  const pinKeypadGap = useMemo(() => getLockPinKeypadGap(normalize), [normalize]);
  const loginStyles = useMemo(
    () => createLoginStyles(width, normalize),
    [width, normalize],
  );

  const [biometricActive, setBiometricActive] = useState(false);
  const [biometricType, setBiometricType] = useState('none');
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorTrigger, setErrorTrigger] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [pinLockoutUntil, setPinLockoutUntil] = useState(null);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState(0);
  const biometricAttemptedRef = useRef(false);

  const isPinLockedOut =
    pinLockoutUntil != null && Date.now() < pinLockoutUntil;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  const runBiometricAuth = useCallback(async () => {
    if (!biometricActive || isPinLockedOut) return;

    const result = await authenticateWithBiometrics(
      '앱 잠금을 해제하려면 인증해 주세요',
    );

    if (result.success) {
      onUnlock();
    }
  }, [biometricActive, isPinLockedOut, onUnlock]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [bioEnabled, availability] = await Promise.all([
        getBiometricEnabled(),
        checkBiometricAvailability(),
      ]);

      if (!mounted) return;

      setBiometricActive(bioEnabled && availability.available);
      setBiometricType(availability.type);
      setIsInitialized(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !biometricActive || isPinLockedOut) return undefined;
    if (biometricAttemptedRef.current) return undefined;

    let timer;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(async () => {
        if (biometricAttemptedRef.current) return;
        biometricAttemptedRef.current = true;

        const result = await authenticateWithBiometrics(
          '앱 잠금을 해제하려면 인증해 주세요',
        );
        if (result.success) {
          onUnlock();
        }
      }, 200);
    });

    return () => {
      interactionTask.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [isInitialized, biometricActive, isPinLockedOut, onUnlock]);

  useEffect(() => {
    if (!pinLockoutUntil) return undefined;

    const tick = () => {
      const remaining = Math.ceil((pinLockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setPinLockoutUntil(null);
        setLockoutRemainingSec(0);
        setFailedAttempts(0);
        return;
      }
      setLockoutRemainingSec(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pinLockoutUntil]);

  const handlePinComplete = async (enteredPin) => {
    if (isPinLockedOut) return;

    const storedPin = await getAppLockPin();
    if (enteredPin === storedPin) {
      setFailedAttempts(0);
      onUnlock();
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setErrorTrigger((prev) => prev + 1);

    if (nextAttempts >= MAX_PIN_ATTEMPTS) {
      setPinLockoutUntil(Date.now() + PIN_LOCKOUT_MS);
      setFailedAttempts(0);
    }
  };

  const pinErrorMessage = isPinLockedOut
    ? `잠시 후 다시 시도해 주세요 (${lockoutRemainingSec}초)`
    : '암호가 올바르지 않습니다';

  const biometricIconColor = isPinLockedOut
    ? colors.textLight20
    : colors.primary;

  const biometricKeypadSlot = biometricActive ? (
      <TouchableOpacity
        style={styles.biometricKeypadSlot}
        onPress={runBiometricAuth}
        activeOpacity={0.6}
        disabled={isPinLockedOut}
      >
        {biometricType === 'face' ? (
          <MaterialCommunityIcons
            name="face-recognition"
            size={normalize(24)}
            color={biometricIconColor}
          />
        ) : (
          <Ionicons
            name="finger-print"
            size={normalize(24)}
            color={biometricIconColor}
          />
        )}
      </TouchableOpacity>
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoWrap}>
        <View style={styles.logoContainer}>
          <View style={loginStyles.logo}>
            <LogoIcon
              width={normalize(100)}
              height={normalize(100)}
              color={colors.primary}
            />
          </View>
          <View style={loginStyles.titleContainer}>
            <Text style={loginStyles.titleLarge}>YOUTH PAPER</Text>
          </View>
        </View>
      </View>

      <View style={styles.pinArea}>
        <PinInput
          title="암호를 입력하세요"
          onPinComplete={handlePinComplete}
          errorTrigger={errorTrigger}
          errorMessage={pinErrorMessage}
          disabled={isPinLockedOut}
          contentStyle={styles.pinInputContent}
          keypadGap={pinKeypadGap}
          leftKeypadSlot={biometricKeypadSlot}
        />
        {isPinLockedOut && (
          <Text style={styles.lockoutText}>
            잠시 후 다시 시도해 주세요 ({lockoutRemainingSec}초)
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default LockScreen;
