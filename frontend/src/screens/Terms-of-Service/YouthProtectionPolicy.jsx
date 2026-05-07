import React, { useMemo } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';

const POLICY_LINES = [
  '유코스트(이하 "회사")는 청소년이 안전하게 서비스를 이용할 수 있도록 청소년 보호정책을 수립·시행합니다. 본 정책에서 청소년은 만 19세 미만의 자를 말합니다.',
  '회사는 청소년 보호책임자 지정, 유해 정보 차단, 피해 상담 창구 운영 등 핵심 보호 조치를 시행하고 있으며, 서비스 성장에 따라 보호 조치를 단계적으로 확대해 나갈 예정입니다.',
  '---',
  '### 1. 유해 정보 차단 방침',
  '회사는 청소년에게 유해한 정보가 서비스 내에 유통되지 않도록 다음과 같은 조치를 취합니다.',
  '- 음란·폭력·혐오·자해 조장 등 유해 콘텐츠 게시 금지 및 위반 시 삭제/제재',
  '- 불법 촬영물, 아동·청소년 성착취물 등 즉시 삭제·신고 의무 대상 게시물의 지체 없는 삭제 및 관계기관 신고',
  '- 이용자의 생명·안전에 급박한 위험이 확인되는 경우 자살예방법에 따른 긴급구조기관 정보 제공',
  '---',
  '### 2. 아동·청소년 대상 성범죄 무관용 원칙',
  '회사는 아동·청소년 대상 성범죄에 대해 무관용 원칙을 적용합니다. 아래 행위 확인 시 경고 횟수와 관계없이 즉시 계정을 영구 정지하고 필요 시 수사기관에 신고합니다.',
  '- 아동·청소년 성착취물 제작·제공·소지·이용·광고·소개',
  '- 아동·청소년에게 음란물·성착취물 제공',
  '- 아동·청소년 대상 온라인 그루밍(성적·금전적 목적 유도)',
  '- 아동·청소년 성매매 모의·조장',
  '- 아동·청소년을 과도하게 성적으로 대상화하는 콘텐츠 게시',
  '위 행위를 발견한 경우 앱 내 신고 기능 또는 고객센터 이메일을 통해 즉시 제보해 주시기 바랍니다.',
  '---',
  '### 3. 피해 상담 창구',
  '청소년 유해 정보로 인한 피해 상담 및 고충 처리는 아래 청소년 보호책임자에게 문의할 수 있습니다.',
  '회사는 접수된 피해 상담 및 고충을 신속히 처리하고 피해 확산 방지를 위해 노력합니다.',
  '---',
  '### 4. 청소년 보호책임자',
  '- 성명: 김은채',
  '- 직책: 서비스 운영 담당',
  '- 이메일: [기입 예정]',
  '- 전화: [기입 예정]',
  '---',
  '### 5. 외부 상담 기관',
  '청소년 관련 피해는 아래 기관에도 도움을 요청할 수 있습니다.',
  '- 여성가족부 청소년 보호종합지원센터: 1388',
  '- 경찰청 사이버수사국: (국번없이) 182',
  '- 방송통신심의위원회 불법정보신고: 1377',
];

const YouthProtectionPolicy = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="청소년 보호정책" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {POLICY_LINES.map((line, idx) => {
          if (line === '---') return <View key={`d-${idx}`} style={styles.divider} />;
          if (line.startsWith('### ')) {
            return (
              <Text key={`s-${idx}`} style={styles.sectionTitle}>
                {line.replace('### ', '')}
              </Text>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <Text key={`b-${idx}`} style={styles.bullet}>
                {'• '}
                {line.replace('- ', '')}
              </Text>
            );
          }
          return (
            <Text key={`p-${idx}`} style={styles.para}>
              {line}
            </Text>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default YouthProtectionPolicy;
