import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';

/**
 * 학생증 앨범 첨부 — 1장 필수, 2장째 선택
 */
export default function StudentIdPhotoAttachFields({
  normalize = (n) => n,
  busy = false,
  primaryUri,
  primaryAspect = 1,
  secondaryUri,
  secondaryAspect = 1,
  onPrimaryPicked,
  onSecondaryPicked,
  onClearPrimary,
  onClearSecondary,
}) {
  const styles = createStyles(normalize);

  const pick = useCallback(
    async (slot) => {
      if (busy) return;
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 첨부를 위해 앨범 접근 권한이 필요합니다.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('첨부 실패', '이미지를 다시 선택해 주세요.');
        return;
      }
      const payload = {
        uri: asset.uri,
        base64: asset.base64,
        aspect:
          asset.width && asset.height ? asset.width / asset.height : 1,
      };
      if (slot === 'secondary') onSecondaryPicked?.(payload);
      else onPrimaryPicked?.(payload);
    },
    [busy, onPrimaryPicked, onSecondaryPicked],
  );

  const renderSlot = ({
    label,
    required,
    uri,
    aspect,
    onPick,
    onClear,
  }) => (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>
        {label}
        {required ? (
          <Text style={styles.required}> (필수)</Text>
        ) : (
          <Text style={styles.optional}> (선택)</Text>
        )}
      </Text>
      {uri ? (
        <View style={styles.previewWrap}>
          <Image
            source={{ uri }}
            style={{ width: '100%', aspectRatio: aspect || 1 }}
            resizeMode="contain"
          />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={onPick}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.previewBtnText}>바꾸기</Text>
            </TouchableOpacity>
            {onClear ? (
              <TouchableOpacity
                style={[styles.previewBtn, styles.previewBtnMuted]}
                onPress={onClear}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.previewBtnMutedText}>삭제</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.attachBox}
          activeOpacity={0.85}
          onPress={onPick}
          disabled={busy}
        >
          <Ionicons
            name="image-outline"
            size={normalize(28)}
            color={colors.primaryDark}
          />
          <Text style={styles.attachText}>앨범에서 사진 선택</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>
        학생증의 이름과 학교명이 잘 보이도록 사진을 첨부해 주세요. 앞·뒷면이
        필요하면 두 번째 사진을 추가할 수 있어요.
      </Text>
      {renderSlot({
        label: '학생증 사진',
        required: true,
        uri: primaryUri,
        aspect: primaryAspect,
        onPick: () => pick('primary'),
        onClear: primaryUri ? onClearPrimary : null,
      })}
      {renderSlot({
        label: '추가 사진',
        required: false,
        uri: secondaryUri,
        aspect: secondaryAspect,
        onPick: () => pick('secondary'),
        onClear: secondaryUri ? onClearSecondary : null,
      })}
    </View>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    root: {
      gap: normalize(16),
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      lineHeight: normalize(22),
    },
    slot: {
      gap: normalize(8),
    },
    slotLabel: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
    },
    required: {
      fontFamily: fonts.regular,
      color: colors.primaryDark,
      fontSize: normalize(fontSizes.sm),
    },
    optional: {
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      fontSize: normalize(fontSizes.sm),
    },
    attachBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.surface || colors.background,
      borderRadius: normalize(12),
      paddingVertical: normalize(28),
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
    },
    attachText: {
      fontFamily: fonts.regular,
      fontSize: normalize(15),
      color: colors.primaryDark,
    },
    previewWrap: {
      width: '100%',
      borderRadius: normalize(12),
      borderWidth: 2,
      borderColor: colors.primary,
      overflow: 'hidden',
      backgroundColor: colors.surface || '#F5F5F5',
    },
    previewActions: {
      flexDirection: 'row',
      gap: normalize(8),
      padding: normalize(10),
      backgroundColor: colors.background,
    },
    previewBtn: {
      flex: 1,
      height: normalize(36),
      borderRadius: normalize(8),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewBtnText: {
      fontFamily: fonts.bold,
      fontSize: normalize(13),
      color: colors.textWhite,
    },
    previewBtnMuted: {
      backgroundColor: colors.textLight5,
    },
    previewBtnMutedText: {
      fontFamily: fonts.bold,
      fontSize: normalize(13),
      color: colors.textSecondary,
    },
  });
}
