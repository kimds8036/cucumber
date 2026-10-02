import React from 'react';
import { Dimensions, View } from 'react-native';
import ChatInput from '../../../../components/ChatInput.jsx';
import { USES_NATIVE_INPUT_BAR } from '../../../../components/NativeInputBarIOS.jsx';

export default function MessageInput({
  value,
  onChange,
  onSend,
  images,
  onImagesChange,
  styles,
  normalize,
  replyToMessage,
  clearReplyTarget,
  bottomInset,
  mainPlaceholder,
  chatInputStyles,
}) {
  const n =
    typeof normalize === 'function'
      ? normalize
      : (size) => Math.round((Dimensions.get('window').width / 375) * size);
  const paddingBottom = USES_NATIVE_INPUT_BAR
    ? bottomInset
    : bottomInset > 0
      ? bottomInset
      : n(12);

  return (
    <View style={{ paddingBottom }}>
      <ChatInput
        value={value}
        onChange={onChange}
        onSend={onSend}
        selectedImages={images}
        onImagesChange={onImagesChange}
        styles={chatInputStyles ? { ...styles, ...chatInputStyles } : styles}
        normalize={n}
        placeholder={mainPlaceholder}
        replyToMessage={replyToMessage}
        clearReplyTarget={clearReplyTarget}
      />
    </View>
  );
}
