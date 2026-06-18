import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  PERSONAL_MAIL_CHAR_LIMIT_BASE,
  PERSONAL_MAIL_CHAR_LIMIT_MAX,
} from '../utils/personalMail';

export function usePersonalMailCharLimit() {
  const [charLimit, setCharLimit] = useState(PERSONAL_MAIL_CHAR_LIMIT_BASE);
  const [adRewardUsed, setAdRewardUsed] = useState(false);

  const guardTextLength = useCallback(
    (text) => {
      if (text.length <= charLimit) return true;
      if (!adRewardUsed) {
        Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      } else {
        Alert.alert(
          '알림',
          `최대 ${PERSONAL_MAIL_CHAR_LIMIT_MAX}자까지 작성할 수 있어요.`,
        );
      }
      return false;
    },
    [charLimit, adRewardUsed],
  );

  const handleAdReward = useCallback(() => {
    if (adRewardUsed) return;
    setCharLimit(PERSONAL_MAIL_CHAR_LIMIT_MAX);
    setAdRewardUsed(true);
  }, [adRewardUsed]);

  return {
    charLimit,
    adRewardAvailable: !adRewardUsed,
    guardTextLength,
    handleAdReward,
  };
}
