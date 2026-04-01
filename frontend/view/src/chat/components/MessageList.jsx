import React, { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MessageItem from './MessageItem';
import DateBanner from './DateBanner';

const getFlashListItemType = (item) => item.type;

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

const overrideItemLayout = (layout, item, index, maxColumns, extraData) => {
  layout.size = estimateRowHeight(item, index, extraData ?? 0);
};

export default function MessageList({
  roomId,
  data,
  messages,
  listRef,
  isLoadingMore,
  handleScroll,
  handleStartReached,
  handleListShellLayout,
  listShellVisible,
  contentHeightRef,
  renderMessageProps,
  normalize,
  handleViewableItemsChanged,
}) {
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

  return (
    <View
      style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
      onLayout={handleListShellLayout}
    >
      <FlashList
        ref={listRef}
        key={roomId}
        data={data}
        extraData={messages?.length}
        keyExtractor={extractKey}
        getItemType={getFlashListItemType}
        renderItem={renderItem}
        estimatedItemSize={90}
        drawDistance={1000}
        overrideItemLayout={overrideItemLayout}
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={20}
        removeClippedSubviews={true}
        disableAutoLayout={true}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onStartReached={handleStartReached}
        onStartReachedThreshold={0.01}
        ListHeaderComponent={
          isLoadingMore ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        contentContainerStyle={{ paddingHorizontal: n(6) }}
        onContentSizeChange={(_, h) => {
          if (contentHeightRef) contentHeightRef.current = h;
        }}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
      />
    </View>
  );
}
