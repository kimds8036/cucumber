import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { createFindStyles } from '../../styles/find.style';

const IDfind = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createFindStyles(width, normalize), [width]);

  const [foundId, setFoundId] = useState('');

  const handlePassVerify = () => {
    // TODO: PASS 본인인증 연동 후 응답값으로 아이디를 설정
    const mockFoundId = 'cucumber_user01';
    setFoundId(mockFoundId);
    Alert.alert('안내', 'PASS 본인인증(추후 도입) 완료 처리되었습니다.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={normalize(24)} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>아이디 찾기</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentSection}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: normalize(20) }}
        >
          <Text style={styles.helperText}>PASS 인증은 다음 배포에서 실제 연동됩니다.</Text>

          {foundId ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>확인된 아이디</Text>
              <Text style={styles.resultValue}>{foundId}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footerSection}>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handlePassVerify}>
          <Text style={styles.primaryButtonText}>PASS 본인인증</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default IDfind;
