import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { getTabBarTestView } from 'tab-bar-test';

export default function TabBarTestScreen() {
  const NativeTabBarTest = useMemo(() => getTabBarTestView(), []);

  if (!NativeTabBarTest) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>
          TabBarTest 네이티브 뷰가 이 개발 클라이언트에 없습니다. 다시 빌드한 뒤에 이 화면이 보입니다.
        </Text>
      </View>
    );
  }

  return <NativeTabBarTest style={{ flex: 1 }} />;
}
