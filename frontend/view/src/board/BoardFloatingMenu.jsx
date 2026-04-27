import React from 'react';
import { Modal, TouchableWithoutFeedback, View, Text, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts } from '../../../styles/colors';

function findCommentById(comments, id) {
  for (const c of comments) {
    if (c.id === id) return c;
    if (c.replies?.length) {
      const found = findCommentById(c.replies, id);
      if (found) return found;
    }
  }
  return null;
}

export default function BoardFloatingMenu({
  visible,
  anchor,
  context,
  allComments,
  isMyPostFromApi,
  currentUserId,
  onClose,
  onDeletePost,
  onDeleteComment,
  onSharePost,
  onNoteToUser,
  onReportPost,
  onReportComment,
  styles,
  normalize,
  width,
}) {
  const isPostMenu = context === 'post';
  const isCommentMenu = isPostMenu ? null : context;
  const commentForMenu = isCommentMenu != null ? findCommentById(allComments, isCommentMenu) : null;
  const isMyComment = commentForMenu?.isMyComment === true;

  let menuItems;
  if (isPostMenu && isMyPostFromApi) {
    menuItems = [
      { label: '공유하기', iconName: 'share-outline', onPress: onSharePost },
      { label: '삭제하기', iconName: 'trash-outline', onPress: onDeletePost },
    ];
  } else if (isPostMenu) {
    menuItems = [
      {
        label: '쪽지 보내기',
        iconName: 'chatbubble-outline',
        onPress: () => {
          if (!onNoteToUser?.postUserId) return;
          if (onNoteToUser.postUserId === currentUserId) {
            Alert.alert('안내', '자기 자신에게는 쪽지를 보낼 수 없습니다.');
            return;
          }
          onNoteToUser.start(onNoteToUser.postUserId, 'post');
        },
      },
      { label: '공유하기', iconName: 'share-outline', onPress: onSharePost },
      { label: '신고하기', iconName: 'flag-outline', onPress: onReportPost },
    ];
  } else if (isMyComment) {
    menuItems = [
      {
        label: '삭제하기',
        iconName: 'trash-outline',
        onPress: () => onDeleteComment(isCommentMenu),
      },
    ];
  } else if (commentForMenu) {
    menuItems = [
      {
        label: '쪽지 보내기',
        iconName: 'chatbubble-outline',
        onPress: () => {
          if (commentForMenu.userId && currentUserId && commentForMenu.userId === currentUserId) {
            Alert.alert('안내', '자기 자신에게는 쪽지를 보낼 수 없습니다.');
            return;
          }
          onNoteToUser.start(commentForMenu.userId, 'comment');
        },
      },
      {
        label: '신고하기',
        iconName: 'flag-outline',
        onPress: () => onReportComment?.(isCommentMenu),
      },
    ];
  } else {
    menuItems = [
      {
        label: '쪽지 보내기',
        iconName: 'chatbubble-outline',
        onPress: () => {},
      },
      { label: '신고하기', iconName: 'flag-outline', onPress: onReportPost },
    ];
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            ...(anchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: normalize(12),
                minWidth: width * 0.45,
                maxWidth: width * 0.7,
                paddingVertical: normalize(4),
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 5,
                ...(anchor
                  ? {
                      position: 'absolute',
                      right: width - anchor.x,
                      top: anchor.y,
                    }
                  : {}),
              }}
            >
              {menuItems.map((item, index) => (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: normalize(10),
                      paddingHorizontal: normalize(14),
                    }}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (item.onPress) item.onPress();
                      onClose();
                    }}
                  >
                    <Text
                      style={{
                        fontSize: normalize(13),
                        fontFamily: fonts.regular,
                        color: colors.textPrimary,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Ionicons name={item.iconName} size={normalize(17)} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {index < menuItems.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.textLight10,
                        marginHorizontal: normalize(8),
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

