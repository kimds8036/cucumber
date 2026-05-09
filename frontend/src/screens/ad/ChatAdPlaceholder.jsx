import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const ChatAdPlaceholder = ({
  styles,
  normalize: externalNormalize,
  item = {
    name: '광고',
    content: '스폰서 메시지 영역입니다.',
    time: 'AD',
    unreadCount: 0,
  },
}) => {
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
          <Text style={s.listItemName}>{item.name}</Text>
          <Text style={s.listItemContent} numberOfLines={1}>
            {item.content}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ChatAdPlaceholder;
