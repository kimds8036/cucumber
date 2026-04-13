import React from 'react';
import { View } from 'react-native';
import GlobalToast from './GlobalToast';
import { useToast } from '../../context/ToastContext';
import { navigate } from '../../navigation/navigationRef';

export default function ToastHost() {
  const { visible, toast, hideToast } = useToast();

  const handleToastPress = () => {
    const roomId = toast?.roomId != null ? String(toast.roomId) : null;
    const relatedId = toast?.relatedId != null ? String(toast.relatedId) : null;
    const relatedType = String(toast?.relatedType ?? '').trim();
    const type = String(toast?.type ?? '').trim();
    const category = String(toast?.category ?? '').trim();

    hideToast();

    if (relatedType === 'dm_room' && roomId) {
      navigate('DMChat', { roomId });
      return;
    }
    if (relatedType === 'message_room' && roomId) {
      navigate('Chat', { roomId });
      return;
    }
    if (relatedType === 'personal_mail' && relatedId) {
      navigate('MailDetail', {
        mail: {
          id: relatedId,
          receivedAt: '',
          content: '',
          is_read: false,
        },
      });
      return;
    }
    if (relatedType === 'post' && relatedId) {
      navigate('BoardDetail', {
        post: {
          id: relatedId,
          author: '익명',
          time: '',
          location: '',
          content: '',
          likes: 0,
          comments: 0,
        },
        isMyPost: false,
      });
      return;
    }
    if (relatedType === 'friendship' || type === 'friend_request') {
      navigate('Friends');
      return;
    }
    if (roomId) {
      navigate('Chat', { roomId });
      return;
    }
    if (category === 'system' || category === 'mail' || category === 'post') {
      navigate('Notification');
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 10,
      }}
    >
      <GlobalToast
        visible={visible}
        toastId={toast?.id}
        message={toast?.message}
        senderName={toast?.senderName}
        body={toast?.body}
        isChat={toast?.isChat}
        showProgress={toast?.showProgress}
        onPress={handleToastPress}
        onHide={hideToast}
      />
    </View>
  );
}

