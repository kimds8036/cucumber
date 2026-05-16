import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../../components/common/Skeleton';
import { colors } from '../../../../styles/colors';

/**
 * 우편 내역(history) — 실제 카드(액센트 막대 · 이름·시간 · 본문)와 동일 구조
 */
export default function MailHistorySkeleton({ styles, normalize, rowCount = 5 }) {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const r = n(12);
  const accentW = r;

  const rows = Array.from({ length: rowCount }, (_, i) => ({
    direction: i % 2 === 0 ? 'other' : 'me',
    bodyLines: i % 3 === 0 ? 3 : 2,
  }));

  return (
    <View style={{ alignItems: 'stretch' }}>
      {rows.map((row, idx) => {
        const isOther = row.direction === 'other';
        return (
          <View key={`mail-history-skel-${idx}`} style={styles.historyRow}>
            <View style={styles.historyCard}>
              <View
                style={[
                  styles.historyCardInner,
                  { flexDirection: 'row', alignItems: 'stretch' },
                ]}
              >
                {isOther ? (
                  <View
                    style={{
                      width: accentW,
                      alignSelf: 'stretch',
                      backgroundColor: colors.textLight10,
                      borderTopLeftRadius: r,
                      borderBottomLeftRadius: r,
                    }}
                  />
                ) : null}
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingTop: n(12),
                    paddingBottom: n(12),
                    paddingLeft: isOther ? n(10) : n(14),
                    paddingRight: isOther ? n(14) : n(10),
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginBottom: n(8),
                    }}
                  >
                    <Skeleton
                      width={isOther ? n(56) : n(24)}
                      height={n(13)}
                      borderRadius={n(6)}
                    />
                    <Skeleton
                      width={n(8)}
                      height={n(13)}
                      borderRadius={n(4)}
                      style={{ marginHorizontal: n(4) }}
                    />
                    <Skeleton width={n(88)} height={n(13)} borderRadius={n(6)} />
                  </View>
                  {Array.from({ length: row.bodyLines }, (_, lineIdx) => (
                    <Skeleton
                      key={`body-${lineIdx}`}
                      width={lineIdx === row.bodyLines - 1 ? '82%' : '100%'}
                      height={n(14)}
                      borderRadius={n(6)}
                      style={{ marginBottom: lineIdx < row.bodyLines - 1 ? n(6) : 0 }}
                    />
                  ))}
                </View>
                {!isOther ? (
                  <View
                    style={{
                      width: accentW,
                      alignSelf: 'stretch',
                      backgroundColor: colors.primaryLight50,
                      borderTopRightRadius: r,
                      borderBottomRightRadius: r,
                    }}
                  />
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
