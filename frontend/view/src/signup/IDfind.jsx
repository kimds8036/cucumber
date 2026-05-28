import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../styles/colors';
import { createFindStyles } from '../../../styles/find.style';
import Skeleton from '../../../components/common/Skeleton';

const IDfind = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createFindStyles(width, normalize), [width]);

  const [foundId, setFoundId] = useState('');
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

  const handlePassVerify = () => {
    // TODO: PASS 본인인증 연동 후 응답값으로 아이디를 설정
    const mockFoundId = 'cucumber_user01';
    setFoundId(mockFoundId);
    Alert.alert('안내', 'PASS 본인인증(추후 도입) 완료 처리되었습니다.');
  };

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <Skeleton
              width={normalize(24)}
              height={normalize(24)}
              borderRadius={normalize(12)}
            />
            <Skeleton
              width={normalize(84)}
              height={normalize(18)}
              borderRadius={normalize(8)}
            />
          </View>
        </View>
        <View style={styles.contentSection}>
          <Skeleton
            width="70%"
            height={normalize(14)}
            borderRadius={normalize(6)}
            style={{ marginBottom: normalize(16) }}
          />
          <Skeleton
            width="100%"
            height={normalize(92)}
            borderRadius={normalize(12)}
          />
        </View>
        <View style={styles.footerSection}>
          <Skeleton
            width="100%"
            height={normalize(50)}
            borderRadius={normalize(14)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={normalize(24)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>아이디 찾기</Text>
        </View>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.contentSection}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: normalize(20) }}
          >
            <Text style={styles.helperText}>
              PASS 인증은 다음 배포에서 실제 연동됩니다.
            </Text>

            {foundId ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>확인된 아이디</Text>
                <Text style={styles.resultValue}>{foundId}</Text>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <View style={styles.footerSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={handlePassVerify}
        >
          <Text style={styles.primaryButtonText}>PASS 본인인증</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default IDfind;
