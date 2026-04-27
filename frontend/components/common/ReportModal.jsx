import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { api } from '../../utils/api';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

const REASONS = [
  { key: 'spam', label: '스팸/광고' },
  { key: 'hate', label: '욕설/혐오 표현' },
  { key: 'sexual', label: '음란/선정적 내용' },
  { key: 'privacy', label: '개인정보 노출' },
  { key: 'etc', label: '기타' },
];

/**
 * ReportModal
 *
 * Props:
 *   visible       boolean
 *   onClose       () => void
 *   targetType    'post' | 'comment' | 'schoolMail' | 'schoolMailComment'
 *   targetId      number
 */
export default function ReportModal({ visible, onClose, targetType, targetId }) {
  const { width } = useWindowDimensions();
  const N = getNormalize(width);

  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const translateY = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
      onEnd: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
    },
    []
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    if (loading) return;
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason || loading) return;

    setLoading(true);
    try {
      const endpointMap = {
        post: `/api/posts/${targetId}/report`,
        comment: `/api/comments/${targetId}/report`,
        schoolMail: `/api/mails/school/${targetId}/report`,
        schoolMailComment: `/api/mails/school/comments/${targetId}/report`,
      };
      const endpoint = endpointMap[targetType];
      if (!endpoint) {
        Alert.alert('오류', '신고 대상을 확인할 수 없습니다.');
        return;
      }

      await api.post(endpoint, {
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      Alert.alert('신고 접수', '신고가 접수되었습니다.', [
        { text: '확인', onPress: handleClose },
      ]);
    } catch (err) {
      const message =
        err?.response?.data?.message || '신고 처리 중 오류가 발생했습니다.';
      Alert.alert('오류', message);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(N);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.root}>
          {/* 배경 딤 */}
          <TouchableOpacity style={s.backdrop} onPress={handleClose} activeOpacity={1} />

          <Reanimated.View style={[s.sheetWrapper, animStyle]}>
            <View style={s.sheet}>
              {/* 헤더 */}
              <View style={s.header}>
                <Text style={s.title}>신고하기</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={12} disabled={loading}>
                  <Text style={s.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={s.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* 안내 문구 */}
                <Text style={s.guide}>
                  신고 사유를 선택하고 필요한 내용을 작성해 주세요.
                </Text>

                {/* 사유 칩 */}
                <View style={s.chipRow}>
                  {REASONS.map((r) => {
                    const active = selectedReason === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setSelectedReason(r.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 상세 입력 */}
                <TextInput
                  style={s.textInput}
                  placeholder="상세 사유를 입력해 주세요 (선택)"
                  placeholderTextColor={colors.textLight40}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={500}
                />
                <Text style={s.charCount}>{description.length} / 500</Text>
              </ScrollView>

              {/* 제출 버튼 */}
              <View style={s.footer}>
                <TouchableOpacity
                  style={[s.submitBtn, !selectedReason && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!selectedReason || loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.submitText}>신고 접수</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Reanimated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const makeStyles = (N) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheetWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: '#fff',
      borderTopLeftRadius: N(20),
      borderTopRightRadius: N(20),
      paddingBottom: N(20),
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: N(20),
      paddingVertical: N(14),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: N(16),
      color: colors.textPrimary,
    },
    closeBtn: {
      fontSize: N(16),
      color: colors.textSecondary,
    },
    body: {
      paddingHorizontal: N(20),
      paddingTop: N(18),
      paddingBottom: N(8),
    },
    guide: {
      fontFamily: fonts.regular,
      fontSize: N(13),
      color: colors.textSecondary,
      lineHeight: N(19),
      marginBottom: N(18),
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: N(8),
      marginBottom: N(20),
    },
    chip: {
      paddingHorizontal: N(14),
      paddingVertical: N(8),
      borderRadius: N(20),
      borderWidth: 1,
      borderColor: colors.textLight20,
      backgroundColor: '#fff',
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight10,
    },
    chipText: {
      fontFamily: fonts.regular,
      fontSize: N(13),
      color: colors.textSecondary,
    },
    chipTextActive: {
      fontFamily: fonts.medium,
      color: colors.primary,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.textLight20,
      borderRadius: N(10),
      padding: N(12),
      fontFamily: fonts.regular,
      fontSize: N(13),
      color: colors.textPrimary,
      minHeight: N(100),
      backgroundColor: colors.textLight5,
    },
    charCount: {
      fontFamily: fonts.regular,
      fontSize: N(11),
      color: colors.textLight40,
      textAlign: 'right',
      marginTop: N(6),
    },
    footer: {
      paddingHorizontal: N(20),
      paddingTop: N(12),
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: N(12),
      paddingVertical: N(14),
      alignItems: 'center',
    },
    submitBtnDisabled: {
      backgroundColor: colors.textLight20,
    },
    submitText: {
      fontFamily: fonts.bold,
      fontSize: N(15),
      color: '#fff',
    },
  });