import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../../styles/colors';
import { createMessageStyles, getNormalize } from '../../../../styles/message.style';

const ITEMS = [
  { name: '익명', content: '오늘 밥 뭐 나옴?' },
  { name: '익명', content: '안녕' },
  { name: '익명', content: '몇 반이야?' },
  { name: '홍길동', content: '오늘 급식 머야?', unread: 1 },
  { name: '익명', content: '왜 그래?' },
  { name: '김철수', content: 'ㅋㅋㅋㅋㅋ' },
  { name: '익명', content: '친해지고 싶어!' },
  { name: '익명', content: '수업 끝나고 연락할게' },
  { name: '김라온', content: '오늘 학원 가?' },
];

export default function DummyMessage({ tab = 'note' }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMessageStyles(width, normalize), [width, normalize]);

  const isMail = tab === 'mail';

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <View style={styles.toggleTrack}>
          <View style={[styles.togglePill, { left: isMail ? '50%' : '0%' }]} />
          <View style={styles.toggleOption}>
            <Text style={[styles.toggleOptionText, !isMail && styles.toggleOptionTextActive]}>
              쪽지
            </Text>
          </View>
          <View style={styles.toggleOption}>
            <Text style={[styles.toggleOptionText, isMail && styles.toggleOptionTextActive]}>
              개인 우편
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {ITEMS.map((item, idx) => (
            <TouchableOpacity key={`${item.name}-${idx}`} style={styles.listItem} activeOpacity={1}>
              <View style={styles.listItemLeft}>
                <View style={[styles.profileCircle, { backgroundColor: colors.green }]}>
                  <Text style={{ color: colors.primaryDark, fontSize: normalize(12) }}>
                    {item.name.slice(0, 1)}
                  </Text>
                </View>
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <Text style={styles.listItemContent} numberOfLines={1}>
                    {item.content}
                  </Text>
                </View>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemTime}>18:20</Text>
                {item.unread ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                  </View>
                ) : isMail ? (
                  <Feather name="send" size={normalize(12)} color={colors.background2} />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isMail ? (
          <View style={styles.floatingButton}>
            <Feather name="send" size={normalize(24)} color={colors.background} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
