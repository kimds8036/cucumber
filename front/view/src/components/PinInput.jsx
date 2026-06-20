import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createPinStyles, getNormalize } from '../../../styles/pin.style';
import { colors } from '../../../styles/colors';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const PinInput = ({
  title,
  onPinComplete,
  errorTrigger = 0,
  errorMessage = '',
  disabled = false,
  contentStyle,
  keypadGap,
  keypadStyle,
  leftKeypadSlot,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createPinStyles(normalize), [normalize, width]);

  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const completingRef = useRef(false);

  const resetPin = useCallback(() => {
    setPin('');
    setHasError(false);
    completingRef.current = false;
  }, []);

  const triggerError = useCallback(() => {
    setHasError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetPin();
    });
  }, [resetPin, shakeAnim]);

  useEffect(() => {
    if (errorTrigger > 0) {
      triggerError();
    }
  }, [errorTrigger, triggerError]);

  const handleDigit = (digit) => {
    if (disabled || completingRef.current || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      completingRef.current = true;
      onPinComplete(next);
    }
  };

  const handleDelete = () => {
    if (disabled || completingRef.current) return;
    setPin((prev) => prev.slice(0, -1));
    setHasError(false);
  };

  const renderDot = (index) => {
    const filled = index < pin.length;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          !hasError && filled && styles.dotFilled,
          hasError && (filled ? styles.dotFilledError : styles.dotError),
        ]}
      />
    );
  };

  return (
    <View
      style={[
        styles.content,
        contentStyle,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={styles.title}>{title}</Text>

      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {[0, 1, 2, 3].map(renderDot)}
      </Animated.View>

      <Text style={styles.errorText}>{hasError ? errorMessage : ''}</Text>

      {keypadGap != null ? <View style={{ height: keypadGap }} /> : null}

      <View
        style={[
          styles.keypad,
          keypadGap == null && { marginTop: 'auto' },
          keypadStyle,
        ]}
      >
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keypadKey}
                activeOpacity={0.4}
                onPress={() => handleDigit(key)}
                disabled={disabled}
              >
                <Text style={styles.keypadKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keypadRow}>
          {leftKeypadSlot != null ? (
            <View style={styles.keypadKey}>{leftKeypadSlot}</View>
          ) : (
            <View style={styles.keypadKeyPlaceholder} />
          )}
          <TouchableOpacity
            style={styles.keypadKey}
            activeOpacity={0.4}
            onPress={() => handleDigit('0')}
            disabled={disabled}
          >
            <Text style={styles.keypadKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keypadKey}
            activeOpacity={0.4}
            onPress={handleDelete}
            disabled={disabled}
          >
            <Ionicons
              name="backspace-outline"
              size={normalize(22)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PinInput;
