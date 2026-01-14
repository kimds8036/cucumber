import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createLoginStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import { Ionicons } from '@expo/vector-icons';

const Login = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const styles = useMemo(() => createLoginStyles(width, normalize), [width]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 로고 */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/Group 166.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.titleContainer}>
          <Text style={styles.titleLarge}>오</Text>
          <Text style={styles.titleSmall}>늘의 </Text>
          <Text style={styles.titleLarge}>이</Text>
          <Text style={styles.titleSmall}>야기</Text>
        </View>
      </View>

      {/* 아이디 입력 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="아이디"
          placeholderTextColor={colors.textSecondary}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
        />

        {/* 비밀번호 입력 */}
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* 아이디 저장 체크박스 */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setRememberMe(!rememberMe)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && (
            <Ionicons name="checkmark" size={normalize(14)} color={colors.background} />
          )}
        </View>
        <Text style={styles.checkboxText}>아이디 저장</Text>
      </TouchableOpacity>

      {/* 링크들 */}
      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.linkText}>아이디 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.linkDivider}>|</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.linkText}>비밀번호 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.linkDivider}>|</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Sign')}>
          <Text style={styles.linkText}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Login;
