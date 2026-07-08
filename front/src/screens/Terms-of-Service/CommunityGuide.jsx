import React, { useMemo } from 'react';
import {
  Linking,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';

const COMMUNITY_GUIDE_MARKDOWN = require('./_community_md.json');

const GUIDE_LINES = COMMUNITY_GUIDE_MARKDOWN.split('\n');

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function buildInlineNodes(line, linkStyle) {
  const nodes = [];
  let last = 0;
  let m;
  const re = new RegExp(INLINE_TOKEN.source, 'g');
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(line.slice(last, m.index));
    }
    const token = m[1];
    if (token.startsWith('**')) {
      nodes.push(
        <Text key={`ib-${m.index}`} style={{ fontWeight: '700' }}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (lm) {
        const url = lm[2];
        nodes.push(
          <Text
            key={`il-${m.index}`}
            style={linkStyle}
            onPress={() => Linking.openURL(url)}
          >
            {lm[1]}
          </Text>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }
  if (last < line.length) {
    nodes.push(line.slice(last));
  }
  if (nodes.length === 0) {
    nodes.push(line);
  }
  return nodes;
}

const CommunityGuide = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);
  const linkStyle = useMemo(
    () => ({
      ...styles.para,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.para],
  );
  const bulletLinkStyle = useMemo(
    () => ({
      ...styles.bullet,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.bullet],
  );
  const blockquoteLinkStyle = useMemo(
    () => ({
      ...styles.blockquote,
      color: '#2563eb',
      textDecorationLine: 'underline',
      fontStyle: 'normal',
    }),
    [styles.blockquote],
  );
  const chapterLinkStyle = useMemo(
    () => ({
      ...styles.chapterTitle,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.chapterTitle],
  );
  const sectionLinkStyle = useMemo(
    () => ({
      ...styles.sectionTitle,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.sectionTitle],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="커뮤니티 가이드" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {GUIDE_LINES.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed === '# 커뮤니티 가이드') return null;
          if (trimmed === '---') {
            return <View key={`d-${idx}`} style={styles.divider} />;
          }
          if (trimmed.startsWith('#### ')) {
            return (
              <Text key={`h4-${idx}`} style={styles.sectionTitle}>
                {buildInlineNodes(
                  trimmed.replace('#### ', ''),
                  sectionLinkStyle,
                )}
              </Text>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <Text key={`s-${idx}`} style={styles.sectionTitle}>
                {buildInlineNodes(
                  trimmed.replace('### ', ''),
                  sectionLinkStyle,
                )}
              </Text>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={`c-${idx}`} style={styles.chapterTitle}>
                {buildInlineNodes(trimmed.replace('## ', ''), chapterLinkStyle)}
              </Text>
            );
          }
          if (trimmed.startsWith('>')) {
            const inner = trimmed.replace(/^>\s?/, '').trim();
            if (!inner) return null;
            return (
              <Text key={`q-${idx}`} style={styles.blockquote}>
                {buildInlineNodes(inner, blockquoteLinkStyle)}
              </Text>
            );
          }
          if (trimmed.startsWith('- ')) {
            const inner = trimmed.replace(/^-\s+/, '');
            return (
              <Text key={`b-${idx}`} style={styles.bullet}>
                {'• '}
                {buildInlineNodes(inner, bulletLinkStyle)}
              </Text>
            );
          }
          return (
            <Text key={`p-${idx}`} style={styles.para}>
              {buildInlineNodes(line, linkStyle)}
            </Text>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CommunityGuide;
