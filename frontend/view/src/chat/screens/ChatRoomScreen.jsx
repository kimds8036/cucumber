import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ChatScreen from './ChatScreen';
import useChat from '../hooks/useChat';
import * as socketManager from '../../socketManager';
import { openNativeChatAndroid } from '../../../../utils/openNativeChatAndroid';
import { openNativeChatIOS } from '../../../../utils/openNativeChatIOS';
import { colors } from '../../../../styles/colors';
import Skeleton from '../../../../components/common/Skeleton';

export default function ChatRoomScreen({ navigation, route }) {
  const roomId = route?.params?.roomId;
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
          title: '쪽지',
          chatChannel: 'messages',
        });
      } else if (Platform.OS === 'ios') {
        ok = await openNativeChatIOS({
          roomId,
          title: '쪽지',
          chatChannel: 'messages',
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
        <View style={styles.skelHeader}>
          <Skeleton width={92} height={16} borderRadius={8} />
        </View>
        <View style={styles.skelBody}>
          <View style={styles.skelRowLeft}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <Skeleton width="58%" height={14} borderRadius={7} />
          </View>
          <View style={styles.skelRowRight}>
            <Skeleton width="52%" height={14} borderRadius={7} />
          </View>
          <View style={styles.skelRowLeft}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <Skeleton width="42%" height={14} borderRadius={7} />
          </View>
        </View>
        <View style={styles.skelInputRow}>
          <Skeleton width="100%" height={44} borderRadius={22} />
        </View>
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
    backgroundColor: colors.background,
  },
  skelHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.textLight10,
    alignItems: 'center',
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
