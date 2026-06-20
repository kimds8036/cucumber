import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import PinInput from './components/PinInput';
import { createPinStyles, getNormalize } from '../../styles/pin.style';
import { setAppLockEnabled, setAppLockPin } from '../../utils/appLockStorage';
import { usePinFlowBackToSettings } from './hooks/usePinFlowBackToSettings';
import { useAppLock } from '../../context/AppLockContext';

const ConfirmPinScreen = ({ navigation, route }) => {
  const { pin, mode = 'set' } = route?.params ?? {};
  const exitToAppSettings = usePinFlowBackToSettings(navigation);
  const { refreshFromStorage } = useAppLock();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createPinStyles(normalize), [normalize, width]);
  const [errorTrigger, setErrorTrigger] = useState(0);

  const handlePinComplete = async (enteredPin) => {
    if (enteredPin !== pin) {
      setErrorTrigger((prev) => prev + 1);
      setTimeout(() => {
        navigation.replace('SetPinScreen', { mode });
      }, 350);
      return;
    }

    await setAppLockPin(enteredPin);
    if (mode === 'set') {
      await setAppLockEnabled(true);
      await refreshFromStorage();
    }

    exitToAppSettings();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="암호 확인" onBack={exitToAppSettings} />
      <View style={{ flex: 1 }}>
        <PinInput
          title="암호를 다시 입력하세요"
          onPinComplete={handlePinComplete}
          errorTrigger={errorTrigger}
          errorMessage="암호가 일치하지 않습니다"
        />
      </View>
    </SafeAreaView>
  );
};

export default ConfirmPinScreen;
