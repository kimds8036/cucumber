import React, { useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from './PolicyMarkdownBody';

const PRIVACY_MARKDOWN = require('./_privacy_md.json');
const HIDDEN_TITLES = ['# 개인정보 처리방침'];

const PrivacyPolicy = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="개인정보 처리방침" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PolicyMarkdownBody
          markdown={PRIVACY_MARKDOWN}
          hiddenTitles={HIDDEN_TITLES}
          styles={styles}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicy;
