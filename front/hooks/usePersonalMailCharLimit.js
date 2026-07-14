import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  PERSONAL_MAIL_CHAR_LIMIT_BASE,
  PERSONAL_MAIL_CHAR_LIMIT_MAX,
} from '../utils/personalMail';

/**
 * 개인우편 글자수 제한 + mail_char_reward 리워드.
 * 슬롯에 광고가 없으면 시청 버튼도 노출하지 않는다.
 *
 * TODO: /api/ads 연동 후 mail_char_reward 슬롯으로 hasRewardAd 판별
 */
export function usePersonalMailCharLimit() {
  // API 연동 전: 리워드 광고 없음 → 시청 버튼 숨김
  const hasRewardAd = false;
  const [charLimit, setCharLimit] = useState(PERSONAL_MAIL_CHAR_LIMIT_BASE);
  const [adRewardUsed, setAdRewardUsed] = useState(false);

  const guardTextLength = useCallback(
    (text) => {
      if (text.length <= charLimit) return true;
      if (hasRewardAd && !adRewardUsed) {
        Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      } else {
        Alert.alert(
          '알림',
          `최대 ${charLimit}자까지 작성할 수 있어요.`,
        );
      }
      return false;
    },
    [charLimit, adRewardUsed, hasRewardAd],
  );

  const handleAdReward = useCallback(() => {
    if (!hasRewardAd || adRewardUsed) return;
    // TODO: 리워드 영상 재생 후 성공 시 한도 확장
    setCharLimit(PERSONAL_MAIL_CHAR_LIMIT_MAX);
    setAdRewardUsed(true);
  }, [adRewardUsed, hasRewardAd]);

  return {
    charLimit,
    adRewardAvailable: hasRewardAd && !adRewardUsed,
    guardTextLength,
    handleAdReward,
  };
}
