import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts } from '../../styles/colors';
import {
  dismissPostWritePromptBanner,
  fetchPostWritePrompt,
} from '../../utils/postWritePrompt';
import { POST_WRITE_CARD_DAYS, POST_WRITE_TOPIC_GROUPS } from '../../view/src/PostWriteGuide';

const TOPICS = POST_WRITE_TOPIC_GROUPS.flatMap((group) => group.topics);
const DAY_MS = 24 * 60 * 60 * 1000;

function cardForSkippedAt(skippedAt) {
  const elapsed = skippedAt ? Date.now() - new Date(skippedAt).getTime() : 0;
  const index = elapsed < DAY_MS ? 0 : elapsed < DAY_MS * 2 ? 1 : 2;
  const day = POST_WRITE_CARD_DAYS[index];
  const topic = TOPICS.find((item) => item.id === day.topicId) || TOPICS[0];
  return { title: day.title, topic };
}

export default function PostWritePromptBanner() {
  const navigation = useNavigation();
  const [card, setCard] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchPostWritePrompt()
        .then((data) => {
          if (cancelled) return;
          setCard(data?.showBanner ? cardForSkippedAt(data.skippedAt) : null);
        })
        .catch(() => {
          if (!cancelled) setCard(null);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!card) return null;

  const open = () => {
    navigation.navigate('PostWriteGuide', {
      fromBanner: true,
      featuredTopicId: card.topic.id,
    });
  };

  const dismiss = () => {
    setCard(null);
    dismissPostWritePromptBanner().catch(() => {});
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        paddingLeft: 14,
        paddingRight: 4,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: colors.primaryLight2,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity style={{ flex: 1, paddingVertical: 4 }} activeOpacity={0.85} onPress={open}>
        <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }}>
          {card.title}
        </Text>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 50,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.textLight1,
          }}
        >
          <Text style={{ fontFamily: fonts.regular, color: colors.textLight6, fontSize: 13 }}>
            {card.topic.label}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="카드 닫기"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="x" size={18} color={colors.textLight4} />
      </TouchableOpacity>
    </View>
  );
}
