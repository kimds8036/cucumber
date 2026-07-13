import React, { useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from './PolicyMarkdownBody';
import { useLegalDocument } from '../../../utils/useLegalDocument';

const FALLBACK_MARKDOWN = require('./_youth_md.json');
const HIDDEN_TITLES = ['# 버전 v1.0'];

const YouthProtectionPolicy = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);
  const { markdown } = useLegalDocument('youth_protection_policy', FALLBACK_MARKDOWN);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="청소년 보호정책" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PolicyMarkdownBody
          markdown={markdown}
          hiddenTitles={HIDDEN_TITLES}
          styles={styles}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default YouthProtectionPolicy;
