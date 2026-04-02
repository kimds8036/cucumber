import React from 'react';
import { View } from 'react-native';
import GlobalToast from './GlobalToast';
import { useToast } from '../../context/ToastContext';
import { navigate } from '../../navigation/navigationRef';

export default function ToastHost() {
  const { visible, toast, hideToast } = useToast();

  const handleToastPress = () => {
    const roomId = toast?.roomId;
    if (!roomId) return;
    hideToast();
    if (toast?.relatedType === 'dm_room') {
      navigate('DMChat', { roomId });
      return;
    }
    navigate('Chat', { roomId });
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
        isChat={toast?.isChat}
        onPress={handleToastPress}
        onHide={hideToast}
      />
    </View>
  );
}

