import React from 'react';
import { View, Text } from 'react-native';
import ProfileIcon from '../../../assets/Profile.svg';
import { colors } from '../../../styles/colors';

const ChatAdPlaceholder = ({
  styles,
  normalize,
  item = { name: '광고', content: '스폰서 메시지 영역입니다.', time: 'AD', unreadCount: 0 },
}) => (
  <View style={styles.listItem}>
    <View style={styles.listItemLeft}>
      <View style={styles.listItemBody}>
        <Text style={styles.listItemName}>{item.name}</Text>
        <Text style={styles.listItemContent} numberOfLines={1}>
          {item.content}
        </Text>
      </View>
    </View>
  </View>
);

export default ChatAdPlaceholder;
