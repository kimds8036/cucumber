import React, { useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from './PolicyMarkdownBody';
import PolicyDocumentMeta from './PolicyDocumentMeta';
import PolicyDocumentSkeleton from './PolicyDocumentSkeleton';
import { useLegalDocument } from '../../../utils/useLegalDocument';

const FALLBACK_MARKDOWN = require('./_community_md.json');

const CommunityGuide = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);
  const { markdown, meta, loading } = useLegalDocument('community_guide', FALLBACK_MARKDOWN);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title={meta?.title || '커뮤니티 가이드'} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <PolicyDocumentSkeleton styles={styles} normalize={normalize} />
        ) : (
          <>
            <PolicyDocumentMeta meta={meta} styles={styles} />
            <PolicyMarkdownBody markdown={markdown} styles={styles} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CommunityGuide;
