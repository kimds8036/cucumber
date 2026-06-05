import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { api } from '../../utils/api';
import { blockUserById } from '../../utils/blockUser';
import AppPopupModal from './AppPopupModal';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

const REASONS = [
  { key: 'spam', label: '스팸/광고' },
  { key: 'hate', label: '욕설/혐오 표현' },
  { key: 'sexual', label: '음란/선정적 내용' },
  { key: 'privacy', label: '개인정보 노출' },
  { key: 'etc', label: '기타' },
];

const ENDPOINT_MAP = {
  post: (id) => `/api/posts/${id}/report`,
  comment: (id) => `/api/comments/${id}/report`,
  schoolMail: (id) => `/api/mails/school/${id}/report`,
  schoolMailComment: (id) => `/api/mails/school/comments/${id}/report`,
  user: (id) => `/api/friends/${id}/report`,
};

/**
 * 신고 사유 선택 → 신고 API → (성공/이미 신고) 차단 유도 모달
 *
 * Props:
 *   reportedUserId — 차단 대상 users.id (필수)
 *   blockReason — 차단 API reason (DM/우편 등, 선택)
 *   onBlocked — 차단 성공 시 콜백
 */
export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  reportedUserId,
  blockReason = null,
  onBlocked,
}) {
  const { width } = useWindowDimensions();
  const N = getNormalize(width);

  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockPrompt, setBlockPrompt] = useState(null);
  const [errorPopup, setErrorPopup] = useState(null);
  const [blocking, setBlocking] = useState(false);
  const translateY = useSharedValue(0);

  const [blockTargetUserId, setBlockTargetUserId] = useState(null);

  const resolvedReportedUserId =
    blockTargetUserId ??
    (reportedUserId != null ? Number(reportedUserId) : null);

  useEffect(() => {
    if (!visible) {
      setBlockPrompt(null);
      setErrorPopup(null);
      setSelectedReason(null);
      setDescription('');
      setLoading(false);
      setBlocking(false);
      setBlockTargetUserId(null);
    }
  }, [visible]);

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
    [],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const resetForm = () => {
    setSelectedReason(null);
    setDescription('');
  };

  const handleClose = () => {
    if (loading || blocking) return;
    setBlockPrompt(null);
    setErrorPopup(null);
    resetForm();
    onClose();
  };

  const finishAfterDismissBlock = () => {
    setBlockPrompt(null);
    resetForm();
    onClose();
  };

  const runBlock = async () => {
    if (!resolvedReportedUserId) {
      setErrorPopup({
        title: '오류',
        message: '차단할 사용자를 확인할 수 없습니다.',
      });
      return;
    }
    setBlocking(true);
    try {
      await blockUserById(resolvedReportedUserId, { reason: blockReason });
      onBlocked?.(resolvedReportedUserId);
      finishAfterDismissBlock();
    } catch (err) {
      setErrorPopup({
        title: '오류',
        message:
          err?.response?.data?.message || '차단 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setBlocking(false);
    }
  };

  const openBlockPrompt = (mode) => {
    resetForm();
    setBlockPrompt(mode);
  };

  const handleSubmit = async () => {
    if (!selectedReason || loading) return;

    const buildEndpoint = ENDPOINT_MAP[targetType];
    const endpoint = buildEndpoint?.(targetId);
    if (!endpoint) {
      setErrorPopup({
        title: '오류',
        message: '신고 대상을 확인할 수 없습니다.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(endpoint, {
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      const uid =
        res?.data?.data?.reportedUserId ??
        (reportedUserId != null ? Number(reportedUserId) : null);
      if (uid != null) setBlockTargetUserId(uid);
      openBlockPrompt('success');
    } catch (err) {
      const data = err?.response?.data;
      const code = data?.code;
      if (code === 'ALREADY_REPORTED') {
        const uid =
          data?.data?.reportedUserId ??
          (reportedUserId != null ? Number(reportedUserId) : null);
        if (uid != null) setBlockTargetUserId(uid);
        openBlockPrompt('already_reported');
        return;
      }
      setErrorPopup({
        title: '오류',
        message: data?.message || '신고 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(N);
  const showReportSheet = visible && !blockPrompt && !errorPopup;

  const blockTitle =
    blockPrompt === 'already_reported' ? '안내' : '신고 완료';
  const blockMessage =
    blockPrompt === 'already_reported'
      ? '이미 신고 접수가 완료된 사용자입니다. 이 사용자가 작성한 게시물, 댓글, 쪽지 등 모든 상호작용을 보이지 않게 차단하시겠습니까?'
      : '신고가 정상적으로 접수되었습니다. 해당 사용자의 글, 댓글, 쪽지가 더 이상 보이지 않도록 즉시 차단하시겠습니까?';

  return (
    <>
      <Modal
        visible={showReportSheet}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.root}>
            <TouchableOpacity
              style={s.backdrop}
              onPress={handleClose}
              activeOpacity={1}
            />

            <Reanimated.View style={[s.sheetWrapper, animStyle]}>
              <View style={s.sheet}>
                <View style={s.header}>
                  <Text style={s.title}>신고 / 차단</Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    hitSlop={12}
                    disabled={loading}
                  >
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={s.body}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={s.guide}>
                    신고 사유를 선택해 주세요. 신고 접수 후 차단 여부를
                    안내합니다.
                  </Text>

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
                          <Text
                            style={[s.chipText, active && s.chipTextActive]}
                          >
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

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

                <View style={s.footer}>
                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      !selectedReason && s.submitBtnDisabled,
                    ]}
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

      <AppPopupModal
        visible={Boolean(blockPrompt)}
        onClose={finishAfterDismissBlock}
      >
        <Text style={s.popupTitle}>{blockTitle}</Text>
        <Text style={s.popupMessage}>{blockMessage}</Text>
        <View style={s.popupBtnRow}>
          <TouchableOpacity
            style={[s.popupBtn, s.popupBtnCancel]}
            onPress={finishAfterDismissBlock}
            disabled={blocking}
            activeOpacity={0.85}
          >
            <Text style={s.popupBtnCancelText}>그냥 둘래요</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.popupBtn, s.popupBtnConfirm]}
            onPress={runBlock}
            disabled={blocking}
            activeOpacity={0.85}
          >
            {blocking ? (
              <ActivityIndicator color={colors.textWhite} size="small" />
            ) : (
              <Text style={s.popupBtnConfirmText}>차단하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </AppPopupModal>

      <AppPopupModal
        visible={Boolean(errorPopup)}
        onClose={() => setErrorPopup(null)}
      >
        <Text style={s.popupTitle}>{errorPopup?.title}</Text>
        {errorPopup?.message ? (
          <Text style={s.popupMessage}>{errorPopup.message}</Text>
        ) : null}
        <TouchableOpacity
          style={[s.popupBtn, s.popupBtnConfirm, { alignSelf: 'stretch' }]}
          onPress={() => setErrorPopup(null)}
          activeOpacity={0.85}
        >
          <Text style={s.popupBtnConfirmText}>확인</Text>
        </TouchableOpacity>
      </AppPopupModal>
    </>
  );
}

const makeStyles = (N) =>
  StyleSheet.create({
    root: { flex: 1 },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
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
      paddingVertical: N(20),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: N(18),
      color: colors.textPrimary,
    },
    closeBtn: { fontSize: N(16), color: colors.textSecondary },
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
      paddingVertical: N(6),
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
      borderRadius: N(8),
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
      paddingTop: N(6),
      paddingBottom: N(20),
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: N(12),
      paddingVertical: N(14),
      alignItems: 'center',
    },
    submitBtnDisabled: { backgroundColor: colors.textLight20 },
    submitText: {
      fontFamily: fonts.bold,
      fontSize: N(15),
      color: '#fff',
    },
    popupTitle: {
      fontSize: 18,
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 10,
    },
    popupMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    popupBtnRow: {
      flexDirection: 'row',
      gap: 10,
      alignSelf: 'stretch',
    },
    popupBtn: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    popupBtnCancel: {
      backgroundColor: colors.textLight10,
    },
    popupBtnConfirm: {
      backgroundColor: colors.primary,
    },
    popupBtnCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    popupBtnConfirmText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
