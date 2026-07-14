import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { colors } from '../../styles/colors';

export default function AppPopupModal({
  visible,
  onClose,
  children,
  animationType = 'fade',
  dismissOnBackdrop = true,
  dismissOnBackPress = dismissOnBackdrop,
  cardStyle,
  containerStyle,
  overlayColor = 'rgba(0,0,0,0.3)',
  useDefaultContainerWidth = true,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={dismissOnBackPress ? onClose : () => {}}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: overlayColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />
        <View
          style={[
            useDefaultContainerWidth ? { width: '86%', maxWidth: 420 } : null,
            containerStyle,
          ]}
        >
          <View
            style={[
              {
                backgroundColor: colors.background,
                borderRadius: 18,
                paddingHorizontal: 18,
                paddingVertical: 25,
                // 바깥은 86%/maxWidth인데, 카드에 width가 없으면 콘텐츠만큼만 줄어들어 좁게 보임
                ...(useDefaultContainerWidth
                  ? { alignSelf: 'stretch', width: '100%' }
                  : { alignSelf: 'center' }),
              },
              cardStyle,
            ]}
          >
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}
