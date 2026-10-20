/**
 * 가입 직후 첫 게시글 안내.
 * 건너뛰면 게시판으로 가고, 글쓰기에서 뒤로 가면 이 화면으로 돌아온다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import SignupPrimaryFooter from './signup/SignupPrimaryFooter';
import { markPostWritePromptSkipped } from '../../utils/postWritePrompt';

export const POST_WRITE_TOPIC_GROUPS = [
  {
    title: '가볍게 던져 보세요',
    topics: [
      { id: 'meal', label: '🍚 오늘 급식은?', starter: '오늘 급식 메뉴', tags: ['급식'] },
      { id: 'song', label: '🎧 요즘 반복 재생 중인 노래', starter: '요즘 이 노래만 들어요', tags: ['플리추천'] },
      { id: 'sleepy', label: '😴 제일 졸린 수업', starter: '이 과목만 되면 눈이 감겨요', tags: ['학교'] },
      { id: 'snack', label: '🥤 매점·편의점 최애 조합', starter: '이 조합 안 먹어본 사람?', tags: ['꿀조합'] },
      { id: 'wallpaper', label: '📱 폰 배경화면 공개', starter: '제 배경화면은요…', tags: ['배경화면'] },
      { id: 'love', label: '💌 연애상담', starter: '연애 고민이 하나 있어요', tags: ['연애상담', '썸'] },
    ],
  },
  {
    title: '학교 얘기',
    topics: [
      { id: 'rule', label: '🏫 우리 학교 이상한 규칙', starter: '이거 우리 학교만 그런가요?', tags: ['학교'] },
      { id: 'teacher', label: '🧑‍🏫 선생님 어록', starter: '우리 쌤 단골멘트', tags: ['쌤'] },
      { id: 'pe', label: '🏃 체육 시간 레전드', starter: '체육 시간에 이런 일이…', tags: ['썰'] },
      { id: 'bag', label: '🎒 가방 속 필수템', starter: '제 가방에는 항상 이게 있어요', tags: ['필수템'] },
    ],
  },
  {
    title: '공부·시험',
    topics: [
      { id: 'stuck', label: '✏️ 공부 안 될 때 하는 행동', starter: '공부 안 될 때 저는…', tags: ['공부'] },
      { id: 'goal', label: '⏰ 오늘 공부 목표 선언', starter: '오늘 목표는 이거예요', tags: ['공부인증'] },
      { id: 'book', label: '📚 내 최애 문제집·인강', starter: '이거 진짜 추천해요', tags: ['최애'] },
      { id: 'cram', label: '🧠 벼락치기 vs 꾸준히', starter: '저는 이 방식이에요', tags: ['벼락치기'] },
    ],
  },
  {
    title: '밸런스·투표',
    topics: [
      { id: 'mbti', label: '🧩 MBTI 소개', starter: '제 MBTI는', tags: ['mbti'] },
      { id: 'break', label: '🎒 방학 vs 개학', starter: '그래도 저는…', tags: ['밸런스'] },
    ],
  },
  {
    title: '자기소개',
    topics: [
      { id: 'into', label: '🎮 요즘 빠진 것', starter: '요즘 이거에 빠졌어요', tags: ['취미'] },
      { id: 'year', label: '💭 올해 목표 하나', starter: '올해 이것만은 꼭', tags: ['목표'] },
      { id: 'week', label: '🍀 이번 주 소소한 행복', starter: '이번 주에 좋았던 일은', tags: ['소확행'] },
    ],
  },
];

const TOPICS = POST_WRITE_TOPIC_GROUPS.flatMap((group) => group.topics);
const FIRST_TOPIC_COUNT = 6;

export const POST_WRITE_CARD_DAYS = [
  { title: '첫 글 남기고 인사해요', topicId: 'meal' },
  { title: '제일 졸린 수업, 뭐예요?', topicId: 'sleepy' },
  { title: '이번 주 소소한 행복 적어볼까요', topicId: 'week' },
];

function shuffleTopics(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function splitTopics(pinnedId) {
  const pinned = TOPICS.find((topic) => topic.id === pinnedId) || null;
  const others = shuffleTopics(TOPICS.filter((topic) => topic.id !== pinned?.id));
  if (!pinned) {
    return { first: others.slice(0, FIRST_TOPIC_COUNT), rest: others.slice(FIRST_TOPIC_COUNT) };
  }
  return {
    first: [pinned, ...others.slice(0, FIRST_TOPIC_COUNT - 1)],
    rest: others.slice(FIRST_TOPIC_COUNT - 1),
  };
}

export default function PostWriteGuide({ navigation, route }) {
  const fromBanner = Boolean(route?.params?.fromBanner);
  const preview = Boolean(route?.params?.preview);
  const featuredTopicId = route?.params?.featuredTopicId || null;
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize, width), [normalize, width]);
  const [pools] = useState(() => splitTopics(featuredTopicId));
  const [showRest, setShowRest] = useState(false);
  const [selectedId, setSelectedId] = useState(featuredTopicId);
  const headerX = useRef(new Animated.Value(-28)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const topicY = useRef(new Animated.Value(22)).current;
  const topicOpacity = useRef(new Animated.Value(0)).current;

  const goLater = useCallback(() => {
    if (preview) {
      navigation.goBack();
      return;
    }
    markPostWritePromptSkipped().catch(() => {});
    if (fromBanner) {
      navigation.goBack();
      return;
    }
    navigation.replace('Main', { screen: 'board' });
  }, [preview, fromBanner, navigation]);

  useFocusEffect(
    useCallback(() => {
      headerX.setValue(-28);
      headerOpacity.setValue(0);
      topicY.setValue(22);
      topicOpacity.setValue(0);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(headerX, { toValue: 0, duration: 420, useNativeDriver: true }),
          Animated.timing(headerOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(topicY, { toValue: 0, duration: 420, useNativeDriver: true }),
          Animated.timing(topicOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]),
      ]).start();
    }, [headerOpacity, headerX, topicOpacity, topicY]),
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goLater();
      return true;
    });
    return () => sub.remove();
  }, [goLater]);

  const selected = TOPICS.find((topic) => topic.id === selectedId);

  const visibleTopics = showRest ? [...pools.first, ...pools.rest] : pools.first;

  const chooseTopic = (topicId) => {
    setSelectedId((prev) => (prev === topicId ? null : topicId));
  };

  const goWrite = () => {
    navigation.navigate('BoardWrite', {
      boardContext: 'national',
      fromPostWriteGuide: preview || !fromBanner,
      ...(preview ? { preview: true } : null),
      contentPlaceholder: selected?.starter || '오늘 있었던 일을 편하게 적어봐요',
      ...(selected?.tags?.length ? { initialHashtags: selected.tags } : null),
      afterSubmit: 'board',
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.wash}>
        <View style={styles.badge}>
          <Feather name="edit-3" size={normalize(30)} color={colors.text} />
        </View>
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateX: headerX }] }}>
          {fromBanner ? null : <Text style={styles.welcome}>가입 완료! 반가워요</Text>}
          <Text style={styles.title}>첫 글을 남겨볼까요?</Text>
          <Text style={styles.subtitle}>가볍게 한 줄이면 충분해요</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.body, { opacity: topicOpacity, transform: [{ translateY: topicY }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.chipLabel}>이런 주제 어때요?</Text>
          <View style={styles.chipRow}>
            {visibleTopics.map((topic) => {
              const on = topic.id === selectedId;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => chooseTopic(topic.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{topic.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!showRest && pools.rest.length > 0 ? (
            <TouchableOpacity
              onPress={() => setShowRest(true)}
              activeOpacity={0.7}
              style={styles.moreBtn}
              accessibilityRole="button"
            >
              <Text style={styles.moreText}>다른 주제 보기</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </Animated.View>
      <View style={styles.footerBlock}>
        <SignupPrimaryFooter label="글 쓰러 가기" onPress={goWrite} />
        <TouchableOpacity onPress={goLater} activeOpacity={0.7} style={styles.laterBtn} accessibilityRole="button">
          <Text style={styles.laterText}>나중에 할게요</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(normalize, width) {
  const gutter = width * 0.04;
  return {
    root: { flex: 1, backgroundColor: colors.white },
    wash: {
      paddingHorizontal: gutter,
      paddingTop: normalize(120),
      overflow: 'hidden',
      paddingBottom: normalize(14),
      backgroundColor: colors.primaryLight2,
    },
    body: { flex: 1 },
    scroll: { paddingHorizontal: gutter, paddingTop: normalize(18), paddingBottom: normalize(12) },
    badge: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcome: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.primaryDark,
      marginBottom: normalize(4),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading + 4),
      color: colors.text,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight5,
      marginTop: normalize(4),
    },
    chipLabel: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight6,
      marginBottom: normalize(12),
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: normalize(8) },
    moreBtn: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginTop: normalize(4),
    },
    moreText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.primaryDark,
    },
    chip: {
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
      borderRadius: normalize(50),
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.textLight1,
    },
    chipOn: { backgroundColor: colors.primaryLight3, borderColor: colors.primaryDark },
    chipText: { fontFamily: fonts.regular, fontSize: normalize(fontSizes.lg), color: colors.textLight5 },
    chipTextOn: { fontFamily: fonts.bold, color: colors.primaryDark },
    footerBlock: { paddingBottom: normalize(8) },
    laterBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    laterText: { fontFamily: fonts.regular, fontSize: normalize(fontSizes.lg), color: colors.textLight4 },
  };
}
