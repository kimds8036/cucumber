import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import ChatScreen from './ChatScreen';
import useDMChat from '../hooks/useDMChat';
import * as socketManager from '../../socketManager';
import {
  getNormalize as getBoardNormalize,
  createDetailStyles,
} from '../../../../styles/board.style';
import { colors } from '../../../../styles/colors';
import Skeleton from '../../../../components/common/Skeleton';

export default function DMChatScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;
  const friend = route?.params?.friend ?? {};
  const friendName = friend.name || '친구';
  const friendSchool = friend.schoolName || friend.school || '';
  const [showJsxChat, setShowJsxChat] = useState(false);

  useEffect(() => {
    setShowJsxChat(true);
  }, []);

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

  if (!showJsxChat) {
    return (
      <View style={dmStyles.nativeLaunchPlaceholder}>
        <View style={dmStyles.skelHeader}>
          <View style={dmStyles.skelHeaderIdentity}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <View style={{ gap: 6 }}>
              <Skeleton width={92} height={12} borderRadius={6} />
              <Skeleton width={66} height={10} borderRadius={5} />
            </View>
          </View>
        </View>
        <View style={dmStyles.skelBody}>
          <View style={dmStyles.skelRowLeft}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <Skeleton width="50%" height={14} borderRadius={7} />
          </View>
          <View style={dmStyles.skelRowRight}>
            <Skeleton width="58%" height={14} borderRadius={7} />
          </View>
          <View style={dmStyles.skelRowLeft}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <Skeleton width="44%" height={14} borderRadius={7} />
          </View>
        </View>
        <View style={dmStyles.skelInputRow}>
          <Skeleton width="100%" height={44} borderRadius={22} />
        </View>
      </View>
    );
  }

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

const dmStyles = StyleSheet.create({
  nativeLaunchPlaceholder: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skelHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.textLight10,
  },
  skelHeaderIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skelBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },
  skelRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skelRowRight: {
    alignItems: 'flex-end',
  },
  skelInputRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.textLight10,
  },
});
