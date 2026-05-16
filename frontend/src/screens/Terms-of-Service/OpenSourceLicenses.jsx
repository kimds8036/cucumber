import React, { useMemo } from 'react';
import { Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';
import { groupMarkdownBlocks } from './markdownBlocks';

const OPEN_SOURCE_MARKDOWN = require('./_opensource_md.json');
const LICENSE_BLOCKS = groupMarkdownBlocks(OPEN_SOURCE_MARKDOWN.split('\n'));
const HIDDEN_TITLE_LINES = new Set(['# 버전 v1.0']);

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

const OpenSourceLicenses = ({ navigation }) => {
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
  const nestedBulletLinkStyle = useMemo(
    () => ({
      ...styles.bulletNested,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.bulletNested],
  );
  const chapterLinkStyle = useMemo(
    () => ({
      ...styles.chapterTitle,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.chapterTitle],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="오픈소스 라이선스" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {LICENSE_BLOCKS.map((block, idx) => {
          const { trimmed } = block;
          if (HIDDEN_TITLE_LINES.has(trimmed)) return null;
          if (trimmed === '---') {
            return <View key={`d-${idx}`} style={styles.divider} />;
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={`c-${idx}`} style={styles.chapterTitle}>
                {buildInlineNodes(trimmed.replace('## ', ''), chapterLinkStyle)}
              </Text>
            );
          }
          if (block.type === 'bullet' || block.type === 'bulletNested') {
            const isNested = block.type === 'bulletNested';
            return (
              <Text key={`b-${idx}`} style={isNested ? styles.bulletNested : styles.bullet}>
                {'• '}
                {buildInlineNodes(trimmed, isNested ? nestedBulletLinkStyle : bulletLinkStyle)}
              </Text>
            );
          }
          return (
            <Text key={`p-${idx}`} style={styles.para}>
              {buildInlineNodes(trimmed, linkStyle)}
            </Text>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OpenSourceLicenses;
