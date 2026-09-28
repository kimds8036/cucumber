import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import OurSchoolScreen from '../ourschoolscreen';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';
import { useAuth } from '../../../context/AuthContext';
import StudentVerificationCtaModal from '../../../components/auth/StudentVerificationCtaModal';
import { colors } from '../../../styles/colors';

const SchoolTab = ({ navigation }) => {
  const tabNavigation = useNavigation();
  const isFocused = useIsFocused();
  const {
    setHeaderTitle,
    requestStudentVerification,
    studentVerifyUiOpen,
  } = useMainShell();
  const { studentVerificationStatus } = useAuth();
  const [ctaVisible, setCtaVisible] = useState(false);
  /** CTA 닫힌 뒤 준비물 모달을 열지 (페이드 완료 후) */
  const pendingVerifyRef = useRef(false);
  const isApproved = studentVerificationStatus === 'APPROVED';

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.school);
    }, [setHeaderTitle]),
  );

  useEffect(() => {
    if (isApproved) {
      pendingVerifyRef.current = false;
      setCtaVisible(false);
      return;
    }
    if (!isFocused) return;
    // 인증 플로우(준비물·학생증) 진행 중이면 CTA를 다시 띄우지 않음
    if (studentVerifyUiOpen || pendingVerifyRef.current) {
      setCtaVisible(false);
      return;
    }
    setCtaVisible(true);
  }, [isApproved, isFocused, studentVerifyUiOpen]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isApproved ? (
        <OurSchoolScreen navigation={navigation} />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      )}
      <StudentVerificationCtaModal
        visible={ctaVisible && !isApproved}
        status={studentVerificationStatus || 'UNVERIFIED'}
        onClose={() => {
          pendingVerifyRef.current = false;
          setCtaVisible(false);
          tabNavigation.navigate('board');
        }}
        onPressVerify={() => {
          // iOS: CTA Modal이 완전히 내려간 뒤에만 준비물 Modal을 연다
          pendingVerifyRef.current = true;
          setCtaVisible(false);
        }}
        onDismissed={() => {
          if (!pendingVerifyRef.current) return;
          pendingVerifyRef.current = false;
          requestStudentVerification({
            reason: 'school',
            statusHint: studentVerificationStatus,
          });
        }}
      />
    </View>
  );
};

export default SchoolTab;
