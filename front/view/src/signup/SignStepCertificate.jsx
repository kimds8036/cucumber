import React, { useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';
import SignupStepScroll from './SignupStepScroll';

const SignStepCertificate = ({
  styles,
  normalize,
  bottomOffset,
  onChange,
}) => {
  const [certificateUrl, setCertificateUrl] = useState('');
  const [accessNumber, setAccessNumber] = useState('');

  const notifyChange = (override = {}) => {
    onChange?.({
      certificateUrl,
      accessNumber,
      ...override,
    });
  };

  useEffect(() => {
    notifyChange();
  }, [certificateUrl, accessNumber]);

  return (
    <View style={styles.certificateSubmitContainer}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <Text style={styles.inputLabel}>열람용 주소</Text>
        <View style={[styles.inputWrapper, styles.inputRow]}>
          <TextInput
            style={styles.input}
            value={certificateUrl}
            onChangeText={(text) => {
              setCertificateUrl(text);
              notifyChange({ certificateUrl: text });
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <Text style={[styles.inputLabel, styles.certificateSubmitLabelSpaced]}>
          열람 번호
        </Text>
        <View style={[styles.inputWrapper, styles.inputRow]}>
          <TextInput
            style={styles.input}
            value={accessNumber}
            onChangeText={(text) => {
              setAccessNumber(text);
              notifyChange({ accessNumber: text });
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </SignupStepScroll>
    </View>
  );
};

export default SignStepCertificate;
