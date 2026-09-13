import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import OurSchoolScreen from '../ourschoolscreen';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';
import { useAuth } from '../../../context/AuthContext';
import StudentVerificationCtaModal from '../../../components/auth/StudentVerificationCtaModal';
import { colors } from '../../../styles/colors';

const SchoolTab = ({ navigation }) => {
  const tabNavigation = useNavigation();
  const { setHeaderTitle, requestStudentVerification } = useMainShell();
  const { studentVerificationStatus } = useAuth();
  const [ctaVisible, setCtaVisible] = useState(false);
  const isApproved = studentVerificationStatus === 'APPROVED';

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.school);
      if (!isApproved) {
        setCtaVisible(true);
      }
    }, [setHeaderTitle, isApproved]),
  );

  useEffect(() => {
    if (isApproved) setCtaVisible(false);
  }, [isApproved]);

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
          setCtaVisible(false);
          tabNavigation.navigate('board');
        }}
        onPressVerify={() => {
          setCtaVisible(false);
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
