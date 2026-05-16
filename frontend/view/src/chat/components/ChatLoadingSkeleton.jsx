import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../../components/common/Skeleton';
import { colors } from '../../../../styles/colors';

function OpponentMessageSkeleton({
  n,
  withName = false,
  bubbleWidth = '62%',
  lineCount = 2,
}) {
  const profile = n(38);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '92%' }}>
      <Skeleton width={profile} height={profile} borderRadius={n(19)} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: n(5), maxWidth: '78%' }}>
        {withName ? (
          <Skeleton
            width={n(52)}
            height={n(12)}
            borderRadius={n(6)}
            style={{ marginBottom: n(3) }}
          />
        ) : null}
        <View
          style={{
            alignSelf: 'flex-start',
            maxWidth: bubbleWidth,
            width: bubbleWidth,
            paddingVertical: n(8),
            paddingHorizontal: n(12),
            borderRadius: n(16),
            borderTopLeftRadius: 0,
            backgroundColor: colors.textLight10,
            gap: n(6),
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <Skeleton
              key={`opp-line-${i}`}
              width={i === lineCount - 1 ? '78%' : '100%'}
              height={n(14)}
              borderRadius={n(6)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function UserMessageSkeleton({ n, bubbleWidth = '58%', lineCount = 1 }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
      }}
    >
      <View style={{ marginRight: n(7), alignItems: 'flex-end' }}>
        <Skeleton width={n(26)} height={n(10)} borderRadius={n(5)} />
      </View>
      <View
        style={{
          maxWidth: bubbleWidth,
          width: bubbleWidth,
          paddingVertical: n(8),
          paddingHorizontal: n(14),
          borderRadius: n(16),
          borderTopRightRadius: 0,
          backgroundColor: colors.primaryLight30,
          gap: n(6),
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <Skeleton
            key={`me-line-${i}`}
            width={i === lineCount - 1 ? '85%' : '100%'}
            height={n(14)}
            borderRadius={n(6)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * 채팅 리스트 영역 로딩 스켈레톤 (ChatScreen 오버레이 전용).
 * - 익명 쪽지 상단 PostCard 는 PostCard.jsx 가 자체 스켈레톤 처리.
 * - 헤더·입력창은 실제 SubHeader / MessageInput 이 표시됨.
 */
export default function ChatLoadingSkeleton({ normalize }) {
  const n = typeof normalize === 'function' ? normalize : (v) => v;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'flex-end',
        paddingHorizontal: n(6),
        paddingBottom: n(10),
        gap: n(14),
      }}
    >
      <OpponentMessageSkeleton n={n} withName bubbleWidth="64%" lineCount={2} />
      <UserMessageSkeleton n={n} bubbleWidth="52%" />
      <OpponentMessageSkeleton n={n} bubbleWidth="48%" lineCount={1} />
      <UserMessageSkeleton n={n} bubbleWidth="66%" lineCount={2} />
    </View>
  );
}
