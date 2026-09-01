import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';

const AUTO_MS = 4500;
const CARD_WIDTH_RATIO = 0.78;

function HonoreeMiniCard({ honoree, normalize, styles }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniName} numberOfLines={1}>
        {honoree.displayName}
      </Text>
      <Text style={styles.miniSchool} numberOfLines={1}>
        {honoree.schoolName}
      </Text>
    </View>
  );
}

function FameCard({
  item,
  cardWidth,
  normalize,
  styles,
  expanded,
  onToggleExpand,
}) {
  const honorees = item?.honorees || [];
  const primary = honorees[0];
  const multi = honorees.length > 1;

  return (
    <View style={{ width: cardWidth, marginRight: normalize(12) }}>
      <TouchableOpacity
        activeOpacity={multi ? 0.85 : 1}
        onPress={() => {
          if (multi) onToggleExpand(item.id);
        }}
      >
        <View style={styles.card}>
          {primary ? (
            <>
              <Text style={styles.cardName} numberOfLines={1}>
                {primary.displayName}
              </Text>
              <Text style={styles.cardSchool} numberOfLines={1}>
                {primary.schoolName}
              </Text>
            </>
          ) : null}
          <Text style={styles.cardSummary} numberOfLines={3}>
            {item.summary}
          </Text>
          {multi ? (
            <View style={styles.multiBadge}>
              <Text style={styles.multiBadgeText}>
                +{honorees.length - 1}명 · 탭하여 전체 보기
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      {expanded && multi ? (
        <View style={styles.dropdown}>
          {honorees.map((honoree, idx) => (
            <HonoreeMiniCard
              key={`${item.id}-${idx}`}
              honoree={honoree}
              normalize={normalize}
              styles={styles}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const HallOfFameCarousel = ({ items = [], loading = false }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const cardWidth = useMemo(() => width * CARD_WIDTH_RATIO, [width]);
  const gap = normalize(12);
  const snapInterval = cardWidth + gap;

  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const styles = useMemo(
    () => ({
      wrap: { marginTop: normalize(10) },
      title: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.lg),
        color: colors.textPrimary,
      },
      empty: {
        marginTop: normalize(10),
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textSecondary,
        lineHeight: normalize(20),
      },
      skeletonCard: {
        width: cardWidth,
        height: normalize(120),
        borderRadius: normalize(12),
        backgroundColor: colors.textLight10,
        marginRight: gap,
      },
      card: {
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: normalize(14),
        minHeight: normalize(118),
      },
      cardName: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.xl),
        color: colors.textPrimary,
      },
      cardSchool: {
        marginTop: normalize(4),
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textMuted,
      },
      cardSummary: {
        marginTop: normalize(10),
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textSecondary,
        lineHeight: normalize(18),
      },
      multiBadge: {
        marginTop: normalize(10),
        alignSelf: 'flex-start',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
        backgroundColor: colors.primaryLight10,
      },
      multiBadgeText: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.sm),
        color: colors.primaryDark,
      },
      dropdown: {
        marginTop: normalize(8),
        gap: normalize(6),
      },
      miniCard: {
        borderRadius: normalize(8),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(8),
      },
      miniName: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.md),
        color: colors.textPrimary,
      },
      miniSchool: {
        marginTop: normalize(2),
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.sm),
        color: colors.textMuted,
      },
      dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: normalize(6),
        marginTop: normalize(10),
      },
      dot: {
        width: normalize(6),
        height: normalize(6),
        borderRadius: normalize(3),
        backgroundColor: colors.textLight20,
      },
      dotActive: {
        backgroundColor: colors.primary,
        width: normalize(14),
      },
    }),
    [normalize, cardWidth, gap],
  );

  const scrollToIndex = useCallback(
    (nextIndex) => {
      if (!items.length) return;
      const safe = ((nextIndex % items.length) + items.length) % items.length;
      scrollRef.current?.scrollTo({ x: safe * snapInterval, animated: true });
      setIndex(safe);
      setExpandedId(null);
    },
    [items.length, snapInterval],
  );

  useEffect(() => {
    if (manualMode || loading || items.length <= 1) return undefined;
    const timer = setInterval(() => {
      scrollToIndex(index + 1);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [manualMode, loading, items.length, index, scrollToIndex]);

  const onScrollBeginDrag = () => {
    setManualMode(true);
    setExpandedId(null);
  };

  const onMomentumScrollEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / snapInterval);
    setIndex(next);
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>명예의 전당</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: normalize(10) }}>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </ScrollView>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>명예의 전당</Text>
        <Text style={styles.empty}>
          아직 등재된 분이 없어요.{'\n'}
          소중한 의견이 반영되면 이곳에 올라가요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>명예의 전당</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        disableIntervalMomentum
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={{ paddingRight: normalize(16), paddingTop: normalize(10) }}
      >
        {items.map((item) => (
          <FameCard
            key={item.id}
            item={item}
            cardWidth={cardWidth}
            normalize={normalize}
            styles={styles}
            expanded={expandedId === item.id}
            onToggleExpand={toggleExpand}
          />
        ))}
      </ScrollView>
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setManualMode(true);
                scrollToIndex(i);
              }}
              hitSlop={8}
            >
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default HallOfFameCarousel;
