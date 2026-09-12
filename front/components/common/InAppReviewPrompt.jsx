/**
 * 인앱 리뷰 유도 팝업
 * 1) 앱이 마음에 드시나요? → 좋아요 / 아니요
 * 2-좋아요) 별점(기본 5) + 칭찬 한마디
 * 2-아니요) 별점 선택 + 개선사항
 *
 * 테스트: 로그인 후 메인 진입 시마다(세션당 1회) 표시
 * 이후: 10일 접속자만 (REVIEW_PROMPT_TEST_ALWAYS = false)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  requestAppReview,
  saveInAppReviewFeedback,
  shouldShowInAppReviewPrompt,
} from '../../utils/appReview';

/** @typedef {'ask' | 'positive' | 'negative'} ReviewStep */

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
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const show = await shouldShowInAppReviewPrompt();
      if (!cancelled && show) {
        setStep('ask');
        setStars(5);
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
    await markReviewPromptCompleted();
  }, []);

  const onLike = () => {
    setStars(5);
    setComment('');
    setStep('positive');
  };

  const onDislike = () => {
    setStars(3);
    setComment('');
    setStep('negative');
  };

  const onSubmit = async () => {
    const text = String(comment || '').trim();
    if (!text) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const sentiment = step === 'positive' ? 'positive' : 'negative';
      await saveInAppReviewFeedback({
        sentiment,
        stars,
        comment: text,
      });
      setVisible(false);
      await markReviewPromptCompleted();
      // 좋아요·고평점이면 스토어 인앱 리뷰도 시도
      if (sentiment === 'positive' && stars >= 4) {
        setTimeout(() => {
          void requestAppReview({ openStoreFallback: false });
        }, 400);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    step === 'ask'
      ? '앱이 마음에 드시나요?'
      : step === 'positive'
        ? '칭찬 한마디 남겨 주세요'
        : '개선할 점을 알려 주세요';

  const subtitle =
    step === 'ask'
      ? '더 좋은 Youth Paper를 만드는 데 도움이 됩니다.'
      : step === 'positive'
        ? '마음에 드신 점을 짧게 적어 주세요.'
        : '불편했던 점이나 바라는 점을 적어 주세요.';

  const canSubmit = String(comment || '').trim().length > 0 && !submitting;

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
              onPress={onLike}
            >
              <Text
                style={{
                  fontSize: normalize(14),
                  fontFamily: fonts.bold,
                  color: colors.textWhite,
                }}
              >
                좋아요
              </Text>
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
              placeholder={
                step === 'positive'
                  ? '예: 타이머랑 게시판이 정말 편해요'
                  : '예: ○○ 기능이 더 있으면 좋겠어요'
              }
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
                backgroundColor: canSubmit
                  ? colors.primary
                  : colors.textLight5,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
              disabled={!canSubmit}
              onPress={onSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text
                  style={{
                    fontSize: normalize(14),
                    fontFamily: fonts.bold,
                    color: canSubmit
                      ? colors.textWhite
                      : colors.textSecondary,
                  }}
                >
                  작성하기
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
