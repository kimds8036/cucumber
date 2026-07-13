import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from '../../../src/screens/Terms-of-Service/PolicyMarkdownBody';
import { useLegalDocument } from '../../../utils/useLegalDocument';

const FALLBACK_MARKDOWN = require('../../../src/screens/Terms-of-Service/_privacy_md.json');
const HIDDEN_TITLES = ['# 개인정보 처리방침'];

// 약관 모달: 개인정보 처리방침 전문 보기 화면
const SignStepPrivacyPolicy = ({ normalize, onBack }) => {
  const s = makeStyles(normalize);
  const docStyles = useMemo(() => createServiceStyles(normalize), [normalize]);
  const { markdown } = useLegalDocument('privacy_policy', FALLBACK_MARKDOWN);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      statusBarTranslucent
      onRequestClose={onBack}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          {Platform.OS === 'ios' && <View style={s.grabber} />}
          <View style={s.sheetHeaderRow}>
            <View style={s.leftPlaceholder} />
            <Text style={s.sheetTitle}>개인정보 처리방침</Text>
            <View style={s.rightPlaceholder} />
          </View>
        </View>
        <View style={s.headerDivider} />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PolicyMarkdownBody
            markdown={markdown}
            hiddenTitles={HIDDEN_TITLES}
            styles={docStyles}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    sheetHeader: {
      backgroundColor: colors.background,
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
    },
    grabber: {
      alignSelf: 'center',
      width: normalize(36),
      height: normalize(5),
      borderRadius: normalize(999),
      backgroundColor: colors.textLight20,
      marginTop: normalize(2),
      marginBottom: normalize(8),
    },
    sheetHeaderRow: {
      height: normalize(34),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftPlaceholder: {
      minWidth: normalize(44),
    },
    sheetTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    rightPlaceholder: {
      minWidth: normalize(44),
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.textLight20,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: normalize(20),
      paddingTop: normalize(16),
      paddingBottom: normalize(32),
      gap: normalize(8),
    },
  });

export default SignStepPrivacyPolicy;
