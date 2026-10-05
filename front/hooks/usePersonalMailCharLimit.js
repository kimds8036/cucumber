import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  PERSONAL_MAIL_CHAR_LIMIT_BASE,
  PERSONAL_MAIL_CHAR_LIMIT_MAX,
} from '../utils/personalMail';
import {
  getRewardedUnitId,
  initAdMob,
  isAdMobReady,
  showRewardedAd,
} from '../utils/admob';

/**
 * 개인우편 글자수 제한 + mail_char_reward 리워드.
 * 애드몹 리워드 단위가 있고 SDK가 준비된 뒤에만 시청 버튼을 연다.
 */
export function usePersonalMailCharLimit() {
  const [rewardReady, setRewardReady] = useState(
    () => isAdMobReady() && Boolean(getRewardedUnitId()),
  );
  const [charLimit, setCharLimit] = useState(PERSONAL_MAIL_CHAR_LIMIT_BASE);
  const [adRewardUsed, setAdRewardUsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initAdMob().then((ok) => {
      if (!cancelled) setRewardReady(ok && Boolean(getRewardedUnitId()));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRewardAd = rewardReady;

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

  const handleAdReward = useCallback(async () => {
    if (!hasRewardAd || adRewardUsed) return;
    const earned = await showRewardedAd();
    if (!earned) return;
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
