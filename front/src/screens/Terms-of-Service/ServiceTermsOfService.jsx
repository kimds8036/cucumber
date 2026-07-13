import React, { useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from './PolicyMarkdownBody';

const SERVICE_TERMS_MARKDOWN = require('./_terms_md.json');
const HIDDEN_TITLES = ['# 서비스 이용 약관'];

const ServiceTermsOfService = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="서비스 이용약관" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PolicyMarkdownBody
          markdown={SERVICE_TERMS_MARKDOWN}
          hiddenTitles={HIDDEN_TITLES}
          styles={styles}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ServiceTermsOfService;
