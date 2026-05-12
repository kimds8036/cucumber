import React, { useMemo } from 'react';
import { Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';

const YOUTH_PROTECTION_MARKDOWN = `# 청소년 보호정책
**제정일**: [2026-05-04]

**시행일**: [2026-05-11]

**버전**: v1.0.0

---

유코스트(이하 "회사")는 「청소년 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라 청소년이 안전하게 서비스를 이용할 수 있도록 청소년 보호정책을 수립·시행합니다. 본 정책에서 청소년은 만 19세 미만의 자를 말합니다.
회사는 현재 청소년 보호책임자 지정, 유해 정보 차단, 피해 상담 창구 운영 등 핵심 보호 조치를 시행하고 있으며, 서비스 성장에 따라 청소년 보호 전담 조직 구성, 운영팀 교육, 청소년 보호계획 수립 등을 단계적으로 확대해 나갈 예정입니다.

---

### 1. 유해 정보 차단 방침

회사는 청소년에게 유해한 정보가 서비스 내에 유통되지 않도록 다음과 같은 조치를 취합니다.

- 음란·폭력·혐오·자해 조장 등 청소년 유해 콘텐츠의 게시를 커뮤니티 이용 규정을 통해 명시적으로 금지하며, 위반 시 게시물 삭제 및 계정 제재 조치를 취합니다. (세부 금지 항목은 커뮤니티 이용 규정을 참고하시기 바랍니다.)
- 불법 촬영물, 아동·청소년 성착취물 등 법령상 즉시 삭제·신고 의무가 있는 게시물은 지체 없이 삭제하고 관계기관에 신고합니다.
- 이용자의 생명·안전에 급박한 위험이 확인되는 경우 「자살예방법」 제19조의3에 의거하여 긴급구조기관에 필요한 정보를 제공할 수 있습니다.

---

### 2. 아동·청소년 대상 성범죄 무관용 원칙

회사는 아동·청소년을 대상으로 한 성범죄에 대하여 무관용 원칙을 적용합니다. 아래 행위가 확인되는 경우 경고 횟수와 관계없이 즉시 계정을 영구 정지하고, 필요 시 수사기관에 신고하는 등 적극적인 법적 조치를 취합니다.

- 아동·청소년 성착취물을 제작·제공·소지·이용하거나 광고·소개하는 행위
- 아동·청소년에게 음란물·성착취물을 제공하는 행위
- 아동·청소년을 대상으로 신뢰를 형성한 후 성적·금전적 목적으로 유도하는 행위(온라인 그루밍)
- 아동·청소년의 성을 매매하거나 이를 모의·조장하는 행위
- 아동·청소년을 과도하게 성적으로 대상화하는 콘텐츠를 게시하는 행위

위 행위를 발견한 경우 앱 내 신고 기능 또는 고객센터 이메일을 통해 즉시 제보해 주시기 바랍니다.

---

### 3. 피해 상담 창구

청소년 유해 정보로 인한 피해 상담 및 고충 처리는 아래 청소년 보호책임자에게 문의할 수 있습니다.

회사는 접수된 피해 상담 및 고충을 신속히 처리하고 피해 확산 방지를 위해 노력합니다.

---

### 4. 청소년 보호책임자

| 항목 | 내용 |
| --- | --- |
| 성명 | 김은채 |
| 직책 | 서비스 운영 담당 |
| 이메일 | team.ucost@gmail.com |

---

### 5. 외부 상담 기관

청소년 관련 피해는 아래 기관에도 도움을 요청할 수 있습니다.

- **여성가족부 청소년 보호종합지원센터**: 1388
- **경찰청 사이버수사국**: (국번없이) 182
- **방송통신심의위원회 불법정보신고**: 1377`;

const POLICY_LINES = YOUTH_PROTECTION_MARKDOWN.split('\n');

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

const YouthProtectionPolicy = ({ navigation }) => {
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
      <SubHeader title="청소년 보호정책" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {POLICY_LINES.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed === '# 청소년 보호정책') return null;
          if (trimmed === '---') return <View key={`d-${idx}`} style={styles.divider} />;
          if (/^\|(\s*:?-+:?\s*\|)+$/.test(trimmed)) {
            return <View key={`t-${idx}`} style={styles.divider} />;
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={`c-${idx}`} style={styles.chapterTitle}>
                {buildInlineNodes(trimmed.replace('## ', ''), sectionLinkStyle)}
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
              {buildInlineNodes(trimmed, linkStyle)}
            </Text>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default YouthProtectionPolicy;
