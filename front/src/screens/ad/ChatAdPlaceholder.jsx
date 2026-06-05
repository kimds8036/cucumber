import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const DEFAULT_CHAT_AD_ITEM = {
  name: '광고',
  content: '스폰서 메시지 영역입니다.',
  time: 'AD',
  unreadCount: 0,
};

const ChatAdPlaceholder = ({
  styles,
  normalize: externalNormalize,
  adData,
  item,
}) => {
  const displayItem = {
    ...DEFAULT_CHAT_AD_ITEM,
    ...(item || {}),
    ...(adData
      ? {
          name: adData.name ?? adData.sponsor ?? adData.author ?? '광고',
          content:
            adData.content ?? adData.body ?? '스폰서 메시지 영역입니다.',
        }
      : {}),
  };
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(externalNormalize || normalize, width),
    [externalNormalize, normalize, width],
  );
  const s = styles || adStyles;

  return (
    <View style={s.listItem}>
      <View style={s.listItemLeft}>
        <View style={s.listItemBody}>
          <Text style={s.listItemName}>{displayItem.name}</Text>
          <Text style={s.listItemContent} numberOfLines={1}>
            {displayItem.content}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ChatAdPlaceholder;
