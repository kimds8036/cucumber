import React from 'react';
import { View } from 'react-native';
import ChatInput from '../../../../components/ChatInput.jsx';

export default function MessageInput({
  value,
  onChange,
  onSend,
  images,
  onImagesChange,
  styles,
  normalize,
  replyToMessage: _replyToMessage,
  clearReplyTarget: _clearReplyTarget,
  bottomInset,
  mainPlaceholder,
  chatInputStyles,
}) {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const paddingBottom = bottomInset > 0 ? bottomInset : n(12);

  return (
    <View
      style={[
        {
          paddingBottom,
        },
        chatInputStyles,
      ]}
    >
      <ChatInput
        value={value}
        onChange={onChange}
        onSend={onSend}
        selectedImages={images}
        onImagesChange={onImagesChange}
        styles={styles}
        normalize={normalize}
        placeholder={mainPlaceholder}
      />
    </View>
  );
}
