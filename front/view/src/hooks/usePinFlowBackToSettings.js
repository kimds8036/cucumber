import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** PIN 플로우는 화면 전환마다 replace를 사용해 스택에 PIN 화면이 1개만 쌓이도록 한다. */
export function usePinFlowBackToSettings(navigation) {
  const exitToAppSettings = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        exitToAppSettings();
        return true;
      };
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBack,
      );
      return () => sub.remove();
    }, [exitToAppSettings]),
  );

  return exitToAppSettings;
}
