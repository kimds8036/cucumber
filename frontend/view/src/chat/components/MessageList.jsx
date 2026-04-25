import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Skeleton from '../../../../components/common/Skeleton';
import { CHAT_LIST_SPINNER_DELAY_MS } from '../constants/chatConfig';
import MessageItem from './MessageItem';
import DateBanner from './DateBanner';

const getFlashListItemType = (item) => item.type;

const CHAT_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 10,
  minimumViewTime: 80,
};

const estimateRowHeight = (item, index, totalCount) => {
  if (!item || item.type === 'dateBanner') return 78;
  const showTs = item.showTimestamp !== false;
  let h = item.isMe ? 76 : 102;
  if (!item.isMe && item.showProfile === false) h -= 28;
  if (!showTs) h -= item.isMe ? 18 : 20;
  if (item.parent_content) h += 58;
  const n = Array.isArray(item.images) ? item.images.length : 0;
  if (n > 0) h += n * 204;
  const hasText = Boolean(
    (item.content && String(item.content).trim()) || item.is_deleted,
  );
  if (hasText) h += 46;
  if (item.isFailed || item.status === 'failed') h += 6;
  return Math.max(120, Math.min(h, 2400));
};


export default function MessageList({
  roomId,
  data,
  listRef,
  isLoadingMore,
  handleScroll,
  handleStartReached,
  handleListShellLayout,
  listShellVisible,
  contentHeightRef,
  renderMessageProps,
  normalize,
  handleContentSizeChange,
  onViewableItemsChanged,
}) {
  const initialScrollIndex = Math.max(0, (data?.length ?? 1) - 1);
  const n =
    typeof normalize === 'function'
      ? normalize
      : (v) => v;
  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === 'dateBanner')
        return <DateBanner date={item.dateKey} normalize={normalize} />;
      return <MessageItem message={item} msg={item} {...renderMessageProps} />;
    },
    [renderMessageProps, normalize],
  );

  const extractKey = useCallback((item) => String(item.id), []);

  const totalCount = data?.length ?? 0;
  const overrideItemLayout = useCallback(
    (layout, item, index) => {
      layout.size = estimateRowHeight(item, index, totalCount);
    },
    [totalCount],
  );

  const [showDelayedSpinner, setShowDelayedSpinner] = useState(false);
  useEffect(() => {
    if (!isLoadingMore) {
      setShowDelayedSpinner(false);
      return;
    }
    const t = setTimeout(() => {
      setShowDelayedSpinner(true);
    }, CHAT_LIST_SPINNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [isLoadingMore]);

  return (
    <View
      style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
      onLayout={handleListShellLayout}
    >
      <FlashList
        ref={listRef}
        key={`${roomId}_inverted`}
        inverted
        data={data}
        keyExtractor={extractKey}
        getItemType={getFlashListItemType}
        renderItem={renderItem}
        // 평균 메시지 높이에 맞는 추정값으로 레이아웃 안정화 (텍스트+이미지 포함 평균 높이 기준)
        estimatedItemSize={130}
        // 화면 밖 영역을 넉넉히 미리 렌더링해서 빠른 스크롤 대응
        drawDistance={3000}
        overrideItemLayout={overrideItemLayout}
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={40}
        initialScrollIndex={initialScrollIndex}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        removeClippedSubviews={true}
        disableAutoLayout={true}
        onStartReached={handleStartReached}
        // 화면 높이 1.5배 여유가 있을 때 미리 페이징을 트리거
        onStartReachedThreshold={1.0}
        ListHeaderComponent={
          showDelayedSpinner && isLoadingMore && (data?.length || 0) > 0 ? (
            <View
              style={{
                height: 50,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Skeleton width={14} height={14} borderRadius={7} />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        contentContainerStyle={{ paddingHorizontal: n(6) }}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={CHAT_VIEWABILITY_CONFIG}
      />
    </View>
  );
}
