import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import ChatScreen from './ChatScreen';
import useDMChat from '../hooks/useDMChat';
import * as socketManager from '../../socketManager';
import { openNativeChatAndroid } from '../../../../utils/openNativeChatAndroid';
import { openNativeChatIOS } from '../../../../utils/openNativeChatIOS';
import {
  getNormalize as getBoardNormalize,
  createDetailStyles,
} from '../../../../styles/board.style';
import { colors, fonts } from '../../../../styles/colors';
import MessageTabIcon from '../../../../assets/Group 166.svg';
import { getFriendIconColorByIndex } from '../../../../components/timerFriendModals';

export default function DMChatScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;
  const friend = route?.params?.friend ?? {};
  const friendName = friend.name || '친구';
  const friendSchool = friend.schoolName || friend.school || '';
  const [showJsxChat, setShowJsxChat] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setShowJsxChat(true);
      return;
    }
    let cancelled = false;
    (async () => {
      let ok = false;
      if (Platform.OS === 'android') {
        ok = await openNativeChatAndroid({
          roomId,
          title: friendName,
          subtitle: friendSchool,
          chatChannel: 'dm',
        });
      } else if (Platform.OS === 'ios') {
        ok = await openNativeChatIOS({
          roomId,
          title: friendName,
          subtitle: friendSchool,
          chatChannel: 'dm',
        });
      }
      if (cancelled) return;
      if (ok) {
        navigation.goBack();
        return;
      }
      setShowJsxChat(true);
    })();
    return () => { cancelled = true; };
  }, [roomId, navigation, friendName, friendSchool]);

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
        <ActivityIndicator size="large" color={colors.primary} />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
