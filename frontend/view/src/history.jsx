import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';

export default function MailHistoryScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const threadId = route?.params?.threadId;

  // 더미 히스토리 데이터: direction = 'me' | 'other'
  const historyItems = [
    {
      id: '1',
      direction: 'other',
      label: '받은 우편',
      time: '25/11/02 21:00',
      text: '오늘도 수고했어.\n요즘 많이 힘들어 보이던데 괜찮아?',
    },
    {
      id: '2',
      direction: 'me',
      label: '보낸 답장',
      time: '25/11/02 21:10',
      text: '편지 고마워.\n덕분에 오늘 하루가 좀 더 괜찮았어.',
    },
    {
      id: '3',
      direction: 'other',
      label: '받은 답장',
      time: '25/11/02 21:15',
      text: '나도 고마워.\n다음에 같이 점심 먹자!',
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="히스토리" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.historyScroll}
        contentContainerStyle={styles.historyContainer}
        showsVerticalScrollIndicator={false}
      >
        {historyItems.map((item) => {
          const isMe = item.direction === 'me';
          return (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyCard}>
                <View style={styles.detailSenderRow}>
                  <View
                    style={[
                      styles.detailAvatar,
                      isMe ? styles.detailAvatarMe : styles.detailAvatarOther,
                    ]}
                  />
                  <View style={styles.detailSenderTexts}>
                    <Text style={styles.detailSenderName}>익명</Text>
                    <Text style={styles.detailTime}>{item.time}</Text>
                  </View>
                </View>
                <Text style={styles.historyCardBody}>{item.text}</Text>
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

