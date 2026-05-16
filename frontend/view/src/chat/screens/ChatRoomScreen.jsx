import React, { useMemo } from 'react';
import ChatScreen from './ChatScreen';
import useChat from '../hooks/useChat';
import * as socketManager from '../../socketManager';

export default function ChatRoomScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;

  const hookConfig = useMemo(
    () => ({
      roomId,
      socket: socketManager,
    }),
    [roomId],
  );

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
