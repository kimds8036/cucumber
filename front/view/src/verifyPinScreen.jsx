import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import PinInput from './components/PinInput';
import { createPinStyles, getNormalize } from '../../styles/pin.style';
import { getAppLockPin } from '../../utils/appLockStorage';
import { usePinFlowBackToSettings } from './hooks/usePinFlowBackToSettings';

const VerifyPinScreen = ({ navigation }) => {
  const exitToAppSettings = usePinFlowBackToSettings(navigation);
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createPinStyles(normalize), [normalize, width]);
  const [errorTrigger, setErrorTrigger] = useState(0);

  const handlePinComplete = async (enteredPin) => {
    const storedPin = await getAppLockPin();
    if (enteredPin !== storedPin) {
      setErrorTrigger((prev) => prev + 1);
      return;
    }

    navigation.replace('SetPinScreen', { mode: 'change' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="암호 변경" onBack={exitToAppSettings} />
      <View style={{ flex: 1 }}>
        <PinInput
          title="현재 암호를 입력하세요"
          onPinComplete={handlePinComplete}
          errorTrigger={errorTrigger}
          errorMessage="현재 암호가 올바르지 않습니다"
        />
      </View>
    </SafeAreaView>
  );
};

export default VerifyPinScreen;
