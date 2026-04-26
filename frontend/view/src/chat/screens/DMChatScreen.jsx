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
import { colors, fonts } from '../../../../styles/colors';
import MessageTabIcon from '../../../../assets/Logo.svg';
import { getFriendIconColorByIndex } from '../../../../components/timerFriendModals';
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

  const titleElement = useMemo(
    () => (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          marginLeft: 20,
          minWidth: 0,
        }}
      >
        <View
          style={{
            width: normalize(36),
            height: normalize(36),
            borderRadius: normalize(18),
            backgroundColor: colors.primaryLight30,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: normalize(10),
          }}
        >
          <MessageTabIcon
            width={normalize(22)}
            height={normalize(22)}
            color={getFriendIconColorByIndex(
              friend.colorIndex != null ? friend.colorIndex : 0,
            )}
          />
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: normalize(16),
              lineHeight: normalize(20),
              fontWeight: '700',
              fontFamily: fonts.bold,
              color: colors.textPrimary,
              includeFontPadding: false,
              marginTop: normalize(9),
              marginBottom: normalize(2),
            }}
          >
            {friendName}
          </Text>
          {friendSchool ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: normalize(11),
                fontFamily: fonts.regular,
                color: colors.textSecondary,
                marginTop: normalize(0),
              }}
            >
              {friendSchool}
            </Text>
          ) : null}
        </View>
      </View>
    ),
    [normalize, friendName, friendSchool, friend.colorIndex],
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
        title: ' ',
        titleElement,
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
