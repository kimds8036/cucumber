import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { Logo } from '../components/Logo';
import { CustomInput } from '../components/CustomInput';
import { Checkbox } from '../components/Checkbox';
import { Button } from '../components/Button';
import { FooterLinks } from '../components/FooterLinks';

const LoginScreen = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberInfo, setRememberInfo] = useState(false);

  const handleLogin = () => {
    console.log('Login:', { id, password, rememberInfo });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <Logo />

      <View style={styles.form}>
        <CustomInput placeholder="ID" value={id} onChangeText={setId} />
        <CustomInput placeholder="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry />
        <Checkbox label="REMEMBER INFO" checked={rememberInfo} onPress={() => setRememberInfo(!rememberInfo)} />
        <Button title="로그인" onPress={handleLogin} />
      </View>

      <FooterLinks />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  form: { width: '100%' },
});

export default LoginScreen;