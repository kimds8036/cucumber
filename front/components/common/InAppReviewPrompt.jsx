/**
 * 인앱 리뷰 유도 팝업
 * 1) 앱이 마음에 드시나요? → 좋아요 / 아니요
 * 2-좋아요) 바로 네이티브 스토어 리뷰 모달 요청
 * 2-아니요) 별점 + 개선사항(선택) 수집 후 종료
 *
 * 테스트: REVIEW_PROMPT_TEST_ALWAYS=true 이면 이용일 무시·세션당 1회
 * 운영(false): 누적 이용 10일(연속 X) + 응답 후 90일 쿨다운
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AppPopupModal from './AppPopupModal';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { themedTextInputProps } from '../../styles/mypage.style';
import {
  markReviewPromptCompleted,
  markReviewPromptDeferred,
  markReviewPromptNativeAsked,
  requestAppReview,
  shouldShowInAppReviewPrompt,
  submitDislikeToWhack,
} from '../../utils/appReview';

/** @typedef {'ask' | 'negative'} ReviewStep */

function StarRow({ value, onChange, normalize }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: normalize(6),
        marginBottom: normalize(14),
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${n}점`}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={normalize(32)}
              color={filled ? '#F5B942' : colors.textLight40}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function InAppReviewPrompt() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(/** @type {ReviewStep} */ ('ask'));
  const [stars, setStars] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const show = await shouldShowInAppReviewPrompt();
      if (!cancelled && show) {
        setStep('ask');
        setStars(3);
        setComment('');
        setVisible(true);
      }
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const close = useCallback(async () => {
    setVisible(false);
    await markReviewPromptDeferred();
  }, []);

  const onLike = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setVisible(false);
      // 스토어에 실제 리뷰를 남겼는지는 OS가 알려주지 않음 → 영구 숨김 X, 쿨다운만
      await markReviewPromptNativeAsked();
      setTimeout(() => {
        void (async () => {
          const result = await requestAppReview({ openStoreFallback: true });
          if (__DEV__) {
            Alert.alert(
              '[DEV] 스토어 리뷰',
              result === 'in_app'
                ? 'requestReview() 호출됨.\n실제 별점/리뷰 작성 여부는 앱이 알 수 없습니다.\n모달이 안 보이면 OS 할당량·로컬 설치 제한일 수 있습니다.'
                : result === 'store'
                  ? '네이티브 불가 → 스토어 페이지를 열었습니다.'
                  : '네이티브·스토어 모두 실패했습니다.',
            );
          }
        })();
      }, 350);
    } finally {
      setSubmitting(false);
    }
  };

  const onDislike = () => {
    setStars(3);
    setComment('');
    setStep('negative');
  };

  const onSubmitNegative = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitDislikeToWhack({
        stars,
        comment: String(comment || '').trim(),
      });
      setVisible(false);
      await markReviewPromptCompleted();
      if (__DEV__) {
        Alert.alert(
          '[DEV] 회초리 접수',
          '관리자「회초리」에서 인앱리뷰 ★n 문구로 확인할 수 있습니다.',
        );
      }
    } catch (e) {
      Alert.alert(
        '전송 실패',
        e?.response?.data?.message ||
          '피드백을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    step === 'ask' ? '앱이 마음에 드시나요?' : '개선할 점을 알려 주세요';
  const subtitle =
    step === 'ask'
      ? '더 좋은 Youth Paper를 만드는 데 도움이 됩니다.'
      : '별점을 선택하고, 불편한 점이 있으면 적어 주세요. (선택)';

  return (
    <AppPopupModal
      visible={visible}
      onClose={() => {}}
      dismissOnBackdrop={false}
      dismissOnBackPress={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text
          style={{
            fontSize: normalize(18),
            fontFamily: fonts.bold,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: normalize(8),
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: normalize(13),
            fontFamily: fonts.regular,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: normalize(20),
            marginBottom: normalize(16),
          }}
        >
          {subtitle}
        </Text>

        {step === 'ask' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                backgroundColor: colors.textLight5,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
              disabled={submitting}
              onPress={onDislike}
            >
              <Text
                style={{
                  fontSize: normalize(14),
                  fontFamily: fonts.bold,
                  color: colors.textSecondary,
                }}
              >
                아니요
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
              disabled={submitting}
              onPress={() => {
                void onLike();
              }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text
                  style={{
                    fontSize: normalize(14),
                    fontFamily: fonts.bold,
                    color: colors.textWhite,
                  }}
                >
                  좋아요
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <StarRow value={stars} onChange={setStars} normalize={normalize} />
            <TextInput
              {...themedTextInputProps}
              style={{
                minHeight: normalize(88),
                borderWidth: 1,
                borderColor: colors.border || '#E5E5E5',
                borderRadius: 12,
                paddingHorizontal: normalize(12),
                paddingVertical: normalize(10),
                fontSize: normalize(14),
                fontFamily: fonts.regular,
                color: colors.textPrimary,
                textAlignVertical: 'top',
                marginBottom: normalize(12),
              }}
              placeholder="예: ○○ 기능이 더 있으면 좋겠어요 (선택)"
              placeholderTextColor={colors.textLight40}
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity
              style={{
                height: 44,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
              disabled={submitting}
              onPress={() => {
                void onSubmitNegative();
              }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text
                  style={{
                    fontSize: normalize(14),
                    fontFamily: fonts.bold,
                    color: colors.textWhite,
                  }}
                >
                  보내기
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: normalize(10), alignItems: 'center' }}
              onPress={close}
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: normalize(13),
                  color: colors.textSecondary,
                  fontFamily: fonts.regular,
                }}
              >
                나중에
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </AppPopupModal>
  );
}
