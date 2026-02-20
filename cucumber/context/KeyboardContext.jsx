import React, { createContext, useContext, useRef, useEffect } from 'react';
import { Keyboard, Platform, Animated } from 'react-native';

const KeyboardContext = createContext(null);

export function KeyboardProvider({ children }) {
  // Animated.Value만 사용 → setValue() 시 리렌더 없음, 포커스 유지
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const height = e.endCoordinates?.height ?? 0;
      if (Platform.OS === 'ios' && e.duration != null) {
        Animated.timing(keyboardHeightAnimated, {
          toValue: height,
          duration: e.duration,
          useNativeDriver: true,
        }).start();
      } else {
        keyboardHeightAnimated.setValue(height);
      }
    };

    const onHide = (e) => {
      if (Platform.OS === 'ios' && e?.duration != null) {
        Animated.timing(keyboardHeightAnimated, {
          toValue: 0,
          duration: e.duration,
          useNativeDriver: true,
        }).start();
      } else {
        keyboardHeightAnimated.setValue(0);
      }
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [keyboardHeightAnimated]);

  return (
    <KeyboardContext.Provider value={{ keyboardHeightAnimated }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within KeyboardProvider');
  }
  return context;
}
