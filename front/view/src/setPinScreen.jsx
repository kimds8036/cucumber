import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import PinInput from './components/PinInput';
import { createPinStyles, getNormalize } from '../../styles/pin.style';
import { usePinFlowBackToSettings } from './hooks/usePinFlowBackToSettings';

const SetPinScreen = ({ navigation, route }) => {
  const mode = route?.params?.mode ?? 'set';
  const exitToAppSettings = usePinFlowBackToSettings(navigation);
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createPinStyles(normalize), [normalize, width]);

  const title =
    mode === 'change' ? '새 암호를 입력하세요' : '4자리 암호를 입력하세요';

  const handlePinComplete = (pin) => {
    navigation.replace('ConfirmPinScreen', { pin, mode });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="암호 설정" onBack={exitToAppSettings} />
      <View style={{ flex: 1 }}>
        <PinInput title={title} onPinComplete={handlePinComplete} />
      </View>
    </SafeAreaView>
  );
};

export default SetPinScreen;
