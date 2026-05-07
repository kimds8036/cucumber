import React, { useMemo } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { getNormalize } from '../../../styles/mypage.style';
import { createServiceStyles } from '../../../styles/service.style';

const LICENSE_LINES = [
  '본 앱(Youth Paper)은 아래의 오픈소스 소프트웨어를 사용합니다. 각 소프트웨어의 저작권 및 라이선스 조건은 다음과 같습니다.',
  '---',
  '## MIT License',
  '전문: https://opensource.org/licenses/MIT',
  '- React Native (Meta Platforms, Inc.)',
  '- React (Meta Platforms, Inc.)',
  '- Expo 및 expo-* 패키지 (650 Industries, Inc.)',
  '- @react-navigation/* (React Navigation Contributors)',
  '- react-native-safe-area-context, react-native-screens, react-native-reanimated 등',
  '- @react-native-firebase/*, axios, express, socket.io, ioredis, bull, mysql2 등 다수',
  '---',
  '## Apache License 2.0',
  '전문: https://www.apache.org/licenses/LICENSE-2.0',
  '- Firebase JS SDK (@firebase/*), TypeScript, @grpc/* 등',
  '---',
  '## BSD 3-Clause License',
  '전문: https://opensource.org/licenses/BSD-3-Clause',
  '- protobufjs, source-map, terser, qs, node-forge 등',
  '---',
  '## BSD 2-Clause License',
  '전문: https://opensource.org/licenses/BSD-2-Clause',
  '- css-select, css-what, domhandler, dotenv(backend), fontfaceobserver 등',
  '---',
  '## ISC License',
  '전문: https://opensource.org/licenses/ISC',
  '- graceful-fs, glob, rimraf, lru-cache, semver, yaml, yargs-parser 등',
  '---',
  '## CC-BY-4.0',
  '전문: https://creativecommons.org/licenses/by/4.0/',
  '- caniuse-lite, @fortawesome/free-solid-svg-icons(아이콘 리소스)',
  '---',
  '## MPL-2.0',
  '전문: https://www.mozilla.org/en-US/MPL/2.0/',
  '- lightningcss, lightningcss-win32-x64-msvc',
  '---',
  '## BlueOak-1.0.0 License',
  '전문: https://blueoakcouncil.org/license/1.0.0',
  '- minimatch, minipass, glob(일부 버전)',
  '---',
  '## 기타 라이선스',
  '- big-integer (Unlicense)',
  '- argparse@2.0.1 (Python-2.0)',
  '- spdx-exceptions (CC-BY-3.0)',
  '- spdx-ranges (MIT AND CC-BY-3.0)',
  '- rc (BSD-2-Clause OR MIT OR Apache-2.0)',
  '---',
  '※ 본 고지는 앱 배포 시점 기준이며, 라이브러리 업데이트에 따라 변경될 수 있습니다.',
];

const OpenSourceLicenses = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="오픈소스 라이선스" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {LICENSE_LINES.map((line, idx) => {
          if (line === '---') return <View key={`d-${idx}`} style={styles.divider} />;
          if (line.startsWith('## ')) {
            return (
              <Text key={`c-${idx}`} style={styles.chapterTitle}>
                {line.replace('## ', '')}
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

export default OpenSourceLicenses;
