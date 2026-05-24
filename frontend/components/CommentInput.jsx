import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../styles/colors';

export default function CommentInput({
  bottomInputRef,
  bottomComment,
  setBottomComment,
  replyToCommentId,
  replyToAuthorLabel,
  clearReplyTarget,
  handleSendComment,
  styles,
  normalize,
  /** 최상위 댓글 입력 placeholder (기본: 댓글을 입력하세요) */
  mainPlaceholder,
  selectedImages = [],
  onImagesChange = () => {},
  showImageAttach = false,
  isSendingComment = false,
  inputScrollEnabled = true,
}) {
  return (
    <View style={styles.bottomInputRow}>
      {replyToCommentId ? (
        <View style={styles.replyTargetRow}>
          <Text style={styles.replyTargetText} numberOfLines={1}>
            {replyToAuthorLabel}에게 답글
          </Text>
          <TouchableOpacity
            onPress={clearReplyTarget}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.replyTargetCancel}
          >
            <Ionicons
              name="close-circle"
              size={normalize(18)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      ) : null}
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
                  backgroundColor: '#000',
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={normalize(18)}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.bottomInputInner}>
        {showImageAttach && (
          <TouchableOpacity
            onPress={async () => {
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
            }}
            style={{ paddingHorizontal: 8, justifyContent: 'center' }}
          >
            <Ionicons name="image-outline" size={normalize(24)} color="#888" />
          </TouchableOpacity>
        )}
        <TextInput
          ref={bottomInputRef}
          style={styles.bottomInput}
          placeholder={
            replyToCommentId
              ? `${replyToAuthorLabel}에게 답글 입력...`
              : (mainPlaceholder ?? '댓글을 입력하세요')
          }
          placeholderTextColor={colors.textSecondary}
          value={bottomComment}
          onChangeText={setBottomComment}
          multiline
          scrollEnabled={inputScrollEnabled}
          showsVerticalScrollIndicator={false}
          maxLength={1000}
          editable={!isSendingComment}
          onSubmitEditing={() => {
            if (isSendingComment) return;
            handleSendComment();
          }}
        />
        <TouchableOpacity
          style={styles.sendButton}
          disabled={isSendingComment}
          onPress={() => {
            if (isSendingComment) return;
            if (bottomComment.trim() || selectedImages.length > 0) {
              handleSendComment();
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up"
            size={normalize(22)}
            color={colors.background}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
