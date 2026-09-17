import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const MAX_PHOTOS = 2;

/**
 * 학생증 앨범 첨부 — 한 섹션에서 최대 2장 (게시글 첨부 썸네일 스타일)
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
  onNoStudentIdPress,
}) {
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const photoCount = (primaryUri ? 1 : 0) + (secondaryUri ? 1 : 0);
  const canAddMore = photoCount < MAX_PHOTOS;

  const pickForSlot = useCallback(
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

  const applyAssets = useCallback(
    (assets) => {
      const valid = (assets || []).filter((a) => a?.base64 && a?.uri);
      if (valid.length === 0) {
        Alert.alert('첨부 실패', '이미지를 다시 선택해 주세요.');
        return;
      }
      const toPayload = (asset) => ({
        uri: asset.uri,
        base64: asset.base64,
        aspect:
          asset.width && asset.height ? asset.width / asset.height : 1,
      });

      if (!primaryUri) {
        onPrimaryPicked?.(toPayload(valid[0]));
        if (valid[1]) onSecondaryPicked?.(toPayload(valid[1]));
        return;
      }
      if (!secondaryUri) {
        onSecondaryPicked?.(toPayload(valid[0]));
      }
    },
    [onPrimaryPicked, onSecondaryPicked, primaryUri, secondaryUri],
  );

  const pickAdd = useCallback(async () => {
    if (busy || !canAddMore) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 첨부를 위해 앨범 접근 권한이 필요합니다.');
      return;
    }
    const remaining = MAX_PHOTOS - photoCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;
    applyAssets(result.assets.slice(0, remaining));
  }, [applyAssets, busy, canAddMore, photoCount]);

  const thumbs = [];
  if (primaryUri) {
    thumbs.push({
      key: 'primary',
      uri: primaryUri,
      onReplace: () => pickForSlot('primary'),
      onClear: onClearPrimary,
    });
  }
  if (secondaryUri) {
    thumbs.push({
      key: 'secondary',
      uri: secondaryUri,
      onReplace: () => pickForSlot('secondary'),
      onClear: onClearSecondary,
    });
  }

  return (
    <View style={styles.root}>
      <Text style={styles.slotLabel}>
        학생증 사진
        <Text style={styles.required}> (필수 · 최대 2장)</Text>
      </Text>
      <Text style={styles.hint}>
        학생증의 이름과 학교명이 잘 보이도록 사진을 첨부해 주세요. 앞·뒷면이
        필요하면 두 장까지 연속으로 선택할 수 있어요.
      </Text>

      {thumbs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
          keyboardShouldPersistTaps="handled"
        >
          {canAddMore ? (
            <TouchableOpacity
              onPress={pickAdd}
              disabled={busy}
              style={styles.photoAddButton}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add"
                size={normalize(20)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
          {thumbs.map((thumb) => (
            <View key={thumb.key} style={styles.photoItemWrap}>
              <TouchableOpacity
                onPress={thumb.onReplace}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: thumb.uri }}
                  style={styles.photoThumb}
                />
              </TouchableOpacity>
              {thumb.onClear ? (
                <TouchableOpacity
                  onPress={thumb.onClear}
                  disabled={busy}
                  style={styles.photoDeleteButton}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={normalize(18)}
                    color={colors.background}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity
          style={styles.attachBox}
          activeOpacity={0.85}
          onPress={pickAdd}
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

      {typeof onNoStudentIdPress === 'function' ? (
        <TouchableOpacity
          onPress={onNoStudentIdPress}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={styles.altLinkWrap}
        >
          <Text style={[styles.altLink, busy && styles.disabledLink]}>
            학생증이 없으신가요?
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    root: {
      gap: normalize(12),
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
    hint: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      lineHeight: normalize(22),
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
    photoStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: normalize(6),
      paddingRight: normalize(4),
    },
    photoAddButton: {
      width: normalize(80),
      height: normalize(80),
      borderRadius: normalize(10),
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.textLight10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(8),
      backgroundColor: colors.textLight5,
    },
    photoItemWrap: {
      marginRight: normalize(8),
      position: 'relative',
    },
    photoThumb: {
      width: normalize(80),
      height: normalize(80),
      borderRadius: normalize(10),
      backgroundColor: colors.surface || '#F5F5F5',
    },
    photoDeleteButton: {
      position: 'absolute',
      top: normalize(-6),
      right: normalize(-6),
      backgroundColor: colors.textPrimary,
      borderRadius: normalize(10),
    },
    altLinkWrap: {
      alignSelf: 'center',
      paddingVertical: normalize(6),
    },
    altLink: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md + 1),
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    disabledLink: {
      opacity: 0.45,
    },
  });
}
