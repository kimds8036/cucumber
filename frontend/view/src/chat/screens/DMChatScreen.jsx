import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import ChatScreen from './ChatScreen';
import useDMChat from '../hooks/useDMChat';
import * as socketManager from '../../socketManager';
import {
  getNormalize as getBoardNormalize,
  createDetailStyles,
} from '../../../../styles/board.style';

export default function DMChatScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;
  const friend = route?.params?.friend ?? {};
  const friendName = friend.name || '친구';

  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(
    () => createDetailStyles(width, normalize),
    [width, normalize],
  );

  const chatInputStyles = useMemo(
    () => ({
      bottomInputRow: detailStyles.bottomInputRow,
      bottomInputInner: detailStyles.bottomInputInner,
      bottomInput: detailStyles.bottomInput,
      sendButton: detailStyles.sendButton,
    }),
    [detailStyles],
  );

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
      useChatHook={useDMChat}
      hookConfig={hookConfig}
      chatType="dm"
      headerConfig={{
        title: friendName,
        onBack: () => navigation.goBack(),
      }}
      mainPlaceholder="메시지를 입력하세요"
      chatInputStyles={chatInputStyles}
      opponentName={friendName}
      navigation={navigation}
    />
  );
}
