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
import { colors } from '../styles/colors';

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
}) {
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
        <TextInput
          ref={inputRef}
          style={styles.bottomInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
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
          onPress={() => {
            if (isSending) return;
            if (value.trim() || selectedImages.length > 0) {
              onSend();
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
