import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fontSizes } from '../styles/colors';
import NativeInputBarIOS, { USES_NATIVE_INPUT_BAR } from './NativeInputBarIOS';

async function pickImages(selectedImages, onImagesChange) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 5,
  });
  if (!result.canceled) {
    const uris = result.assets.map((a) => a.uri);
    onImagesChange([...selectedImages, ...uris].slice(0, 5));
  }
}

/** 익명 쪽지·실명 DM 공통 메시지 입력 */
export default function ChatInput({
  inputRef,
  value,
  onChange,
  onSend,
  styles,
  normalize,
  placeholder = '메시지를 입력하세요',
  selectedImages = [],
  onImagesChange = () => {},
  isSending = false,
  inputScrollEnabled = true,
  /**
   * 답장 중이면 사진 버튼을 숨기고 입력칸을 넓힌다.
   * 답장 미리보기는 iOS 네이티브 입력칸만 안에 그리고, JS 입력칸은 ChatScreen이 바깥에 그린다.
   */
  replyToMessage = null,
  clearReplyTarget,
}) {
  const showAttach = !replyToMessage;

  const send = () => {
    if (isSending) return;
    if (value.trim() || selectedImages.length > 0) {
      onSend();
    }
  };

  if (USES_NATIVE_INPUT_BAR) {
    return (
      <NativeInputBarIOS
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onSend={send}
        placeholder={placeholder}
        editable={!isSending}
        fontSize={normalize(fontSizes.xl)}
        showAttach={showAttach}
        onPressAttach={() => pickImages(selectedImages, onImagesChange)}
        images={selectedImages}
        onRemoveImage={(index) =>
          onImagesChange(selectedImages.filter((_, i) => i !== index))
        }
        reply={
          replyToMessage
            ? {
                title: `${replyToMessage.isMe ? '나에게' : '상대방에게'} 답장 중`,
                subtitle: replyToMessage.content || '(이미지 메시지)',
              }
            : null
        }
        replyStyle={{
          titleColor: colors.textLight4,
          titleFontSize: normalize(fontSizes.md),
          subtitleColor: colors.text,
          subtitleFontSize: normalize(fontSizes.xl),
          cancelColor: colors.textLight4,
        }}
        onCancelReply={clearReplyTarget}
      />
    );
  }

  return (
    <View style={styles.bottomInputRow}>
      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
        >
          {selectedImages.map((uri, index) => (
            <View key={index} style={{ marginRight: 8, position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{
                  width: normalize(72),
                  height: normalize(72),
                  borderRadius: 8,
                }}
              />
              <TouchableOpacity
                onPress={() =>
                  onImagesChange(selectedImages.filter((_, i) => i !== index))
                }
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: colors.text,
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={normalize(18)}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.bottomInputInner}>
        {showAttach && (
          <TouchableOpacity
            onPress={() => pickImages(selectedImages, onImagesChange)}
            style={{ paddingHorizontal: 8, justifyContent: 'center' }}
          >
            <Ionicons name="image-outline" size={normalize(24)} color="#888" />
          </TouchableOpacity>
        )}
        <TextInput
          ref={inputRef}
          style={styles.bottomInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight4}
          value={value}
          onChangeText={onChange}
          multiline
          scrollEnabled={inputScrollEnabled}
          showsVerticalScrollIndicator={false}
          maxLength={1000}
          editable={!isSending}
          onSubmitEditing={() => {
            if (isSending) return;
            onSend();
          }}
        />
        <TouchableOpacity
          style={styles.sendButton}
          disabled={isSending}
          onPress={send}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up"
            size={normalize(20)}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
