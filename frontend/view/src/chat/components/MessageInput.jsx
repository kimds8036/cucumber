import React from 'react';
import { View } from 'react-native';
import CommentInput from '../../../../components/CommentInput.jsx';

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
      <CommentInput
        bottomInputRef={null}
        bottomComment={value}
        setBottomComment={onChange}
        selectedImages={images}
        onImagesChange={onImagesChange}
        showImageAttach
        replyToCommentId={null}
        replyToAuthorLabel=""
        clearReplyTarget={clearReplyTarget}
        handleSendComment={onSend}
        styles={styles}
        normalize={normalize}
        mainPlaceholder={mainPlaceholder}
      />
    </View>
  );
}
