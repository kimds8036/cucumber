import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import ChatScreen from './ChatScreen';
import useChat from '../hooks/useChat';
import * as socketManager from '../../socketManager';
import { openNativeChatAndroid } from '../../../../utils/openNativeChatAndroid';
import { colors } from '../../../../styles/colors';

export default function ChatRoomScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;
  const [showJsxChat, setShowJsxChat] = useState(Platform.OS !== 'android');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!roomId) {
      setShowJsxChat(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await openNativeChatAndroid({
        roomId,
        title: '쪽지',
        chatChannel: 'messages',
      });
      if (cancelled) return;
      if (ok) {
        navigation.goBack();
        return;
      }
      setShowJsxChat(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, navigation]);

  const hookConfig = useMemo(
    () => ({
      roomId,
      socket: socketManager,
    }),
    [roomId],
  );

  if (!showJsxChat) {
    return (
      <View style={styles.nativeLaunchPlaceholder}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ChatScreen
      roomId={roomId}
      useChatHook={useChat}
      hookConfig={hookConfig}
      chatType="room"
      headerConfig={{
        title: '쪽지',
        onBack: () => navigation.goBack(),
      }}
      navigation={navigation}
    />
  );
}

const styles = StyleSheet.create({
  nativeLaunchPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
