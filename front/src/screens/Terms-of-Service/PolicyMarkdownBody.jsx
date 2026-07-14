import React, { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import { groupMarkdownBlocks } from './markdownBlocks';

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

function tableCellStyle(styles, colCount, colIndex) {
  if (colCount === 2) {
    return colIndex === 0 ? styles.tableCellLabel : styles.tableCellValue;
  }
  if (colCount === 3) {
    if (colIndex === 0) return styles.tableCellCol3Label;
    if (colIndex === 1) return styles.tableCellCol3Mid;
    return styles.tableCellCol3Last;
  }
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: styles.tableCellLabel?.paddingVertical ?? 10,
    paddingHorizontal: styles.tableCellLabel?.paddingHorizontal ?? 10,
    ...(colIndex < colCount - 1
      ? {
          borderRightWidth: 1,
          borderRightColor: styles.table?.borderColor,
        }
      : null),
  };
}

/** 고객지원·회원가입 모달에서 동일하게 쓰는 약관/방침 본문 렌더러 */
const PolicyMarkdownBody = ({ markdown, hiddenTitles = [], styles }) => {
  const blocks = useMemo(
    () => groupMarkdownBlocks(String(markdown).split('\n')),
    [markdown],
  );
  const hidden = useMemo(() => new Set(hiddenTitles), [hiddenTitles]);

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
  const sectionLinkStyle = useMemo(
    () => ({
      ...styles.sectionTitle,
      color: '#2563eb',
      textDecorationLine: 'underline',
    }),
    [styles.sectionTitle],
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

  return blocks.map((block, idx) => {
    const { trimmed } = block;
    if (hidden.has(trimmed)) return null;
    if (block.type === 'table') {
      const rows = Array.isArray(block.rows) ? block.rows : [];
      if (!rows.length) return null;
      return (
        <View key={`t-${idx}`} style={styles.table}>
          {rows.map((row, ri) => {
            const cols = Array.isArray(row) ? row : [];
            const colCount = Math.max(cols.length, 1);
            const isHeader = ri === 0;
            const isLast = ri === rows.length - 1;
            return (
              <View
                key={`tr-${ri}`}
                style={[
                  styles.tableRow,
                  isHeader ? styles.tableHeaderRow : null,
                  isLast ? styles.tableRowLast : null,
                ]}
              >
                {cols.map((cell, ci) => (
                  <View
                    key={`td-${ci}`}
                    style={tableCellStyle(styles, colCount, ci)}
                  >
                    <View style={styles.tableCellContent}>
                      <Text
                        style={
                          isHeader
                            ? styles.tableHeaderText
                            : ci === 0
                              ? styles.tableCellLabelText
                              : styles.tableCellText
                        }
                      >
                        {buildInlineNodes(String(cell || ''), linkStyle)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      );
    }
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
    if (trimmed.startsWith('### ')) {
      return (
        <Text key={`s-${idx}`} style={styles.sectionTitle}>
          {buildInlineNodes(trimmed.replace('### ', ''), sectionLinkStyle)}
        </Text>
      );
    }
    if (trimmed.startsWith('#### ')) {
      return (
        <Text key={`h4-${idx}`} style={styles.sectionTitle}>
          {buildInlineNodes(trimmed.replace('#### ', ''), sectionLinkStyle)}
        </Text>
      );
    }
    if (block.type === 'blockquote') {
      return (
        <Text key={`q-${idx}`} style={styles.blockquote}>
          {buildInlineNodes(block.trimmed, blockquoteLinkStyle)}
        </Text>
      );
    }
    if (block.type === 'bullet' || block.type === 'bulletNested') {
      const isNested = block.type === 'bulletNested';
      return (
        <Text
          key={`b-${idx}`}
          style={isNested ? styles.bulletNested : styles.bullet}
        >
          {'• '}
          {buildInlineNodes(
            trimmed,
            isNested ? nestedBulletLinkStyle : bulletLinkStyle,
          )}
        </Text>
      );
    }
    return (
      <Text key={`p-${idx}`} style={styles.para}>
        {buildInlineNodes(trimmed, linkStyle)}
      </Text>
    );
  });
};

export default PolicyMarkdownBody;
