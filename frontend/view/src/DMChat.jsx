import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import DMChatScreen from './chat/screens/DMChatScreen';
import Skeleton from '../../components/common/Skeleton';
import { colors } from '../../styles/colors';

export default function DMChat(props) {
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 180);
    return () => clearTimeout(timer);
  }, []);

  if (!screenReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}
      >
        <Skeleton
          width="45%"
          height={18}
          borderRadius={8}
          style={{ marginBottom: 14 }}
        />
        {[0, 1, 2, 3].map((idx) => (
          <Skeleton
            key={`dmchat-skel-${idx}`}
            width={idx % 2 === 0 ? '72%' : '58%'}
            height={44}
            borderRadius={14}
            style={{
              marginBottom: 10,
              alignSelf: idx % 2 === 0 ? 'flex-start' : 'flex-end',
            }}
          />
        ))}
        <Skeleton
          width="100%"
          height={48}
          borderRadius={14}
          style={{ marginTop: 'auto' }}
        />
      </View>
    );
  }

  return <DMChatScreen {...props} />;
}
