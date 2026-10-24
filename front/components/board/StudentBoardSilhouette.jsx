import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../styles/colors';
import { createBoardStyles } from '../../styles/board.style';

const CARDS = [
  { lines: ['88%', '62%'], tags: ['28%'], likes: true, comments: true, scraps: false, photo: false },
  { lines: ['94%', '76%', '40%'], tags: ['36%'], likes: true, comments: true, scraps: true, photo: true },
  { lines: ['100%', '82%', '48%'], tags: ['22%'], likes: false, comments: false, scraps: false, photo: false },
  { lines: ['72%', '34%'], tags: [], likes: true, comments: true, scraps: false, photo: false },
  { lines: ['90%', '68%', '44%'], tags: ['42%'], likes: true, comments: false, scraps: false, photo: true },
  { lines: ['80%', '96%', '36%'], tags: [], likes: false, comments: true, scraps: false, photo: false },
  { lines: ['58%'], tags: ['24%'], likes: true, comments: true, scraps: true, photo: true },
  { lines: ['86%', '70%', '46%'], tags: ['32%'], likes: true, comments: false, scraps: false, photo: false },
];

function Bar({ width, height, radius, shimmer }) {
  const travel = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-48, 220],
  });

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.textLight1,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 36,
          backgroundColor: colors.white,
          opacity: 0.55,
          transform: [{ translateX: travel }],
        }}
      />
    </View>
  );
}

/**
 * 학생 탭 잠금 뒤에 깔리는 글 카드. 글자 자리만 줄 단위 막대다.
 */
export default function StudentBoardSilhouette({ normalize, width }) {
  const styles = useMemo(() => createBoardStyles(width, normalize), [width, normalize]);
  const shimmer = useRef(new Animated.Value(0)).current;
  const lineHeight = normalize(10);
  const lineGap = normalize(7);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View pointerEvents="none" style={{ paddingHorizontal: width * 0.04 }}>
      {CARDS.map((card, index) => {
        const hasStats = card.likes || card.comments || card.scraps;
        return (
          <View key={index} style={styles.postItem}>
            <View style={styles.postHeader}>
              <View style={styles.postAuthorRow}>
                <Bar
                  width={normalize(52)}
                  height={normalize(10)}
                  radius={normalize(5)}
                  shimmer={shimmer}
                />
              </View>
              <View style={styles.distanceBadgeWrap}>
                <View style={styles.distanceBadgeChip}>
                  <MaterialIcons
                    name="location-on"
                    size={normalize(10)}
                    color={colors.primaryDark}
                  />
                  <Bar
                    width={normalize(28)}
                    height={normalize(8)}
                    radius={normalize(4)}
                    shimmer={shimmer}
                  />
                </View>
              </View>
            </View>

            <View style={styles.postBodyRow}>
              <View
                style={[
                  styles.postBodyColumn,
                  card.photo ? styles.postBodyColumnWithThumb : null,
                ]}
              >
                <View style={{ marginBottom: normalize(5) }}>
                  {card.lines.map((lineWidth, lineIndex) => (
                    <View
                      key={lineIndex}
                      style={{ marginBottom: lineIndex === card.lines.length - 1 ? 0 : lineGap }}
                    >
                      <Bar
                        width={lineWidth}
                        height={lineHeight}
                        radius={lineHeight / 2}
                        shimmer={shimmer}
                      />
                    </View>
                  ))}
                </View>
                {card.tags.length > 0 ? (
                  <View style={styles.postTagsWrap}>
                    {card.tags.map((tagWidth, tagIndex) => (
                      <Bar
                        key={tagIndex}
                        width={tagWidth}
                        height={normalize(8)}
                        radius={normalize(4)}
                        shimmer={shimmer}
                      />
                    ))}
                  </View>
                ) : null}
                {hasStats ? (
                  <View style={[styles.postFooter, styles.postFooterStart]}>
                    <View style={styles.postStats}>
                      {card.likes ? (
                        <View style={styles.postStatItem}>
                          <FontAwesome
                            name="heart-o"
                            size={normalize(14)}
                            color={colors.alert}
                          />
                          <Bar
                            width={normalize(14)}
                            height={normalize(8)}
                            radius={normalize(4)}
                            shimmer={shimmer}
                          />
                        </View>
                      ) : null}
                      {card.comments ? (
                        <View style={styles.postStatItem}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={normalize(15)}
                            color={colors.primary}
                          />
                          <Bar
                            width={normalize(12)}
                            height={normalize(8)}
                            radius={normalize(4)}
                            shimmer={shimmer}
                          />
                        </View>
                      ) : null}
                      {card.scraps ? (
                        <View style={styles.postStatItem}>
                          <Ionicons
                            name="bookmark-outline"
                            size={normalize(14)}
                            color={colors.scrap}
                          />
                          <Bar
                            width={normalize(12)}
                            height={normalize(8)}
                            radius={normalize(4)}
                            shimmer={shimmer}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
              {card.photo ? (
                <View style={[styles.postThumb, { backgroundColor: colors.textLight1, overflow: 'hidden' }]}>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: 28,
                      backgroundColor: colors.white,
                      opacity: 0.45,
                      transform: [
                        {
                          translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-32, 90],
                          }),
                        },
                      ],
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
