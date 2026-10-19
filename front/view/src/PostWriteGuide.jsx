/**
 * 가입 직후 첫 게시글 작성 유도 화면 (1장).
 * 미리보기: App.js DEV_PREVIEW_POST_WRITE_GUIDE / MainStack initialRoute.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import SignupPrimaryFooter from './signup/SignupPrimaryFooter';

const TOPICS = [
  { id: 'exam', label: '시험 기간 꿀팁', placeholder: '시험 기간에 이렇게 공부해요' },
  { id: 'school', label: '우리 학교 자랑', placeholder: '우리 학교의 좋은 점' },
  { id: 'today', label: '오늘 있었던 일', placeholder: '오늘 하루 이야기' },
];

export default function PostWriteGuide({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize, width), [normalize, width]);
  const [selectedId, setSelectedId] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const selected = TOPICS.find((t) => t.id === selectedId);

  const goWrite = () => {
    navigation.navigate('BoardWrite', {
      boardContext: 'national',
      ...(selected?.placeholder
        ? { contentPlaceholder: selected.placeholder }
        : null),
      afterSubmit: 'board',
    });
  };

  const toggleTopic = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const goLater = () => {
    navigation.replace('Main', { screen: 'board' });
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.wash}>
        <View style={styles.badge}>
          <Feather name="edit-3" size={normalize(30)} color={colors.text} />
        </View>
        <Text style={styles.title}>첫 글을 남겨볼까요?</Text>
      </View>
      <Animated.View
        style={[
          styles.body,
          { opacity: fade, transform: [{ translateY: rise }] },
        ]}
      >
        <Text style={styles.chipLabel}>이런 주제 어때요?</Text>
        <View style={styles.chipRow}>
          {TOPICS.map((topic) => {
            const on = topic.id === selectedId;
            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleTopic(topic.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {topic.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <View style={styles.footerBlock}>
        <SignupPrimaryFooter label="글 쓰러 가기" onPress={goWrite} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(normalize, width) {
  const gutter = width * 0.04;
  return {
    root: {
      flex: 1,
      backgroundColor: colors.white,
    },
    wash: {
      paddingHorizontal: gutter,
      paddingTop: normalize(250),
      paddingBottom: normalize(14),
      backgroundColor: colors.primaryLight2,
    },
    body: {
      flex: 1,
      paddingHorizontal: gutter,
      paddingTop: normalize(24),
      justifyContent: 'flex-start',
    },
    badge: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading + 4),
      color: colors.text,
    },
    sub: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight5,
      lineHeight: normalize(24),
      marginBottom: normalize(28),
    },
    chipLabel: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight6,
      marginBottom: normalize(10),
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(8),
    },
    chip: {
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
      borderRadius: normalize(50),
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.textLight1,
    },
    chipOn: {
      backgroundColor: colors.primaryLight3,
      borderColor: colors.primaryDark,
    },
    chipText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight5,
    },
    chipTextOn: {
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    footerBlock: {
      paddingBottom: normalize(8),
    },
    laterBtn: {
      alignItems: 'center',
      paddingVertical: normalize(10),
      marginBottom: normalize(4),
    },
    laterText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
  };
}
