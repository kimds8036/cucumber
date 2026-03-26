import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

/**
 * 채팅 메시지 롱프레스 메뉴 표시 유틸
 * @param {Object} msg
 * @param {Function} onCopy
 * @param {Function} onDelete
 * @param {Function} onReply
 * @returns {Promise<void>}
 */
export const showMessageLongPressMenu = async (
  msg,
  onCopy,
  onDelete,
  onReply,
) => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    console.log('[Haptics] 진동 실패:', e);
  }

  Alert.alert('메시지 메뉴', '', [
    {
      text: '복사',
      onPress: () => onCopy?.(msg),
    },
    {
      text: '답장',
      onPress: () => onReply?.(msg),
    },
    ...(msg.isMe && !msg.is_deleted
      ? [
          {
            text: '삭제',
            onPress: () => {
              Alert.alert(
                '메시지 삭제',
                '이 메시지를 삭제하시겠어요?\n상대방 화면에서도 삭제됩니다.',
                [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => onDelete?.(msg.id),
                  },
                ],
              );
            },
            style: 'destructive',
          },
        ]
      : []),
    {
      text: '취소',
      style: 'cancel',
    },
  ]);
};

