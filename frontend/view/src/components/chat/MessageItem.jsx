import React, { memo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Loading from '../../../../components/Loading';
import { colors } from '../../../../styles/colors';
import MessageTabIcon from '../../../../assets/Logo.svg';

function formatChatDateBanner(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
}

const areImagesEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/** 채팅 썸네일: 로딩 전·후 동일 영역(고정 1:1) → 리스트 높이 추정과 스크롤 안정화 */
const CHAT_IMAGE_BOX = 200;

const OptimizedImage = memo(({ uri, onPress, isSending }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    style={{
      width: CHAT_IMAGE_BOX,
      height: CHAT_IMAGE_BOX,
      aspectRatio: 1,
      borderRadius: 12,
      marginBottom: 4,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <Image
      source={{ uri }}
      style={{
        width: CHAT_IMAGE_BOX,
        height: CHAT_IMAGE_BOX,
      }}
      contentFit="cover"
      cachePolicy="memory-disk"
      placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
      transition={200}
      recyclingKey={uri}
      priority="high"
    />
    {isSending ? (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.38)',
        }}
      >
        <Loading color="#fff" size="small" />
        <Text
          style={{
            marginTop: 8,
            color: '#fff',
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          전송 중…
        </Text>
      </View>
    ) : null}
  </TouchableOpacity>
));

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'dateBanner' | undefined} [type]
 * @property {string} [dateKey]
 * @property {boolean} [isMe]
 * @property {boolean} [is_deleted]
 * @property {boolean} [isSending]
 * @property {boolean} [isFailed]
 * @property {string} [status]
 * @property {string|null|undefined} [content]
 * @property {string[]} [images]
 * @property {boolean|undefined} [isReadByOther]
 * @property {boolean|undefined} [isReadByMe]
 * @property {string} [time]
 * @property {number|null} [senderId]
 * @property {boolean} [showProfile] — 그룹 첫 줄(이전과 발신·분 다름)일 때만 true
 * @property {boolean} [showTimestamp] — 그룹 마지막 줄(다음과 발신·분 다름)일 때만 true
 */

function chatGroupRowMargins(msg, normalize) {
  return {
    marginTop: msg.showProfile === false ? normalize(2) : 0,
    marginBottom:
      msg.showTimestamp === false ? normalize(2) : normalize(14),
  };
}

/**
 * @param {{ msg: ChatMessage, normalize: Function }} props
 */
const DateBanner = ({ msg, normalize }) => (
  <View style={{ alignItems: 'center', marginVertical: normalize(8) }}>
    <View
      style={{
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(4),
        borderRadius: normalize(10),
        backgroundColor: '#EEE',
      }}
    >
      <Text style={{ fontSize: normalize(11), color: colors.textSecondary }}>
        {formatChatDateBanner(msg.dateKey)}
      </Text>
    </View>
  </View>
);

/**
 * 상대방 메시지일 때만 보이는 프로필 영역
 * @param {{ chatStyles: any, normalize: Function }} props
 */
const SenderProfile = ({ chatStyles, normalize }) => (
  <View style={chatStyles.chatProfileCircle}>
    <MessageTabIcon
      width={normalize(24)}
      height={normalize(24)}
      color={colors.green}
    />
  </View>
);

const ReplyQuote = ({
  chatStyles,
  senderName,
  content,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.75 : 1}
    disabled={!onPress}
    onPress={onPress}
    style={chatStyles.replyQuoteBox}
  >
    <Text style={chatStyles.replyQuoteSender}>
      {senderName ? senderName : '답장'}
    </Text>
    <Text style={chatStyles.replyQuoteText} numberOfLines={1}>
      {content}
    </Text>
  </TouchableOpacity>
);

/**
 * 실제 메시지(내용/이미지) + 시간/읽음 상태 표시
 * @param {{
 *  msg: ChatMessage,
 *  chatStyles: any,
 *  normalize: Function,
 *  onRetry: Function,
 *  onDeleteMessage: Function,
 *  onImagePress: Function,
 *  onCopyMessage: Function,
 *  onReplyMessage: Function,
 *  onPressReplyTarget: Function,
 *  opponentName: string,
 *  onOpenLongPressMenu: (msg: any, anchor: { x: number, y: number, width: number, height: number }) => void,
 *  isImageOnly: boolean
 * }} props
 */
const MessageBubble = ({
  msg,
  chatStyles,
  normalize,
  onRetry,
  onDeleteMessage,
  onImagePress,
  onCopyMessage,
  onReplyMessage,
  onPressReplyTarget,
  opponentName,
  onOpenLongPressMenu,
  isImageOnly,
}) => {
  const bubbleRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const openMenuFromBubble = () => {
    if (!onOpenLongPressMenu) return;
    bubbleRef.current?.measureInWindow((x, y, w, h) => {
      onOpenLongPressMenu(msg, { x, y, width: w, height: h });
    });
  };
  const messageText = String(msg.content ?? '');
  const isLongMessage = messageText.length > 180;

  // 내 메시지
  if (msg.isMe) {
    return (
      <View
        style={[chatStyles.chatRowUser, chatGroupRowMargins(msg, normalize)]}
      >
        {/* 시간+1 (좌측) */}
        <View style={chatStyles.userTimeColumn}>
          {msg.status === 'failed' || msg.isFailed ? (
            <TouchableOpacity
              onPress={() => onRetry?.(msg)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Text
                style={{
                  color: colors.alert,
                  fontSize: normalize(14),
                  fontWeight: '700',
                }}
              >
                !
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {msg.isReadByOther === false && !msg.isSending && (
                <Text style={chatStyles.chatUnreadCount}>1</Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {(msg.status === 'sending' || msg.isSending) && (
                  <ActivityIndicator size="small" color="#999" />
                )}
                {msg.showTimestamp === true ? (
                  <Text style={chatStyles.chatTimeUser}>
                    {msg.status === 'sending' || msg.isSending
                      ? '...'
                      : msg.time}
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        {/* 말풍선 (우측) */}
        <View ref={bubbleRef} collapsable={false} style={{ maxWidth: '78%' }}>
          <TouchableOpacity
            style={[
              !isImageOnly
                ? chatStyles.userBubble
                : {
                    backgroundColor: 'transparent',
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                  },
              msg.isFailed && { borderWidth: 1, borderColor: colors.alert },
              msg.is_deleted && { backgroundColor: colors.disabled },
            ]}
            onLongPress={() => {
              if (msg.is_deleted || msg.isSending) return;
              openMenuFromBubble();
            }}
            activeOpacity={0.8}
          >
            {/* 답장 인용구 (카카오톡 스타일) */}
            {msg.parent_content ? (
              <ReplyQuote
                chatStyles={chatStyles}
                senderName={msg.parent_sender_name}
                content={msg.parent_content}
                onPress={() => onPressReplyTarget?.(msg.parent_message_id)}
              />
            ) : null}

            {msg.images &&
              msg.images.length > 0 &&
              !msg.is_deleted &&
              msg.images.map((uri, index) => (
                <OptimizedImage
                  key={`${uri}-${index}`}
                  uri={uri}
                  onPress={() => onImagePress?.(uri)}
                  isSending={msg.isSending}
                />
              ))}
            {msg.is_deleted ? (
              <Text style={chatStyles.userBubbleText}>
                삭제된 메시지입니다.
              </Text>
            ) : msg.content ? (
              <>
                <Text
                  style={chatStyles.userBubbleText}
                  numberOfLines={isExpanded ? undefined : (isLongMessage ? 4 : undefined)}
                >
                  {msg.content}
                </Text>
                {isLongMessage ? (
                  <TouchableOpacity
                    onPress={() => setIsExpanded((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={chatStyles.chatTimeUser}>
                      {isExpanded ? '접기' : '전체보기'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 상대방 메시지: [말풍선/이미지] [시간] — 내 메시지 [시간][말풍선]과 대칭, 바닥 정렬
  return (
    <View style={chatStyles.opponentNameAndBubble}>
      {msg.showProfile ? (
        <Text style={chatStyles.opponentName}>{opponentName || '익명'}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          {isImageOnly ? (
            <View ref={bubbleRef} collapsable={false}>
              <Pressable
                onLongPress={() => {
                  if (msg.is_deleted || msg.isSending) return;
                  openMenuFromBubble();
                }}
              >
                <View style={{ alignItems: 'flex-start' }}>
                {msg.parent_content ? (
                  <ReplyQuote
                    chatStyles={chatStyles}
                    senderName={msg.parent_sender_name}
                    content={msg.parent_content}
                    onPress={() => onPressReplyTarget?.(msg.parent_message_id)}
                  />
                ) : null}
                {msg.images &&
                  msg.images.length > 0 &&
                  !msg.is_deleted &&
                  msg.images.map((uri, index) => (
                    <OptimizedImage
                      key={`${uri}-${index}`}
                      uri={uri}
                      onPress={() => onImagePress?.(uri)}
                      isSending={msg.isSending}
                    />
                  ))}
                </View>
              </Pressable>
            </View>
          ) : (
            <>
              {msg.content || msg.is_deleted ? (
                <View ref={bubbleRef} collapsable={false}>
                  <Pressable
                    onLongPress={() => {
                      if (msg.is_deleted || msg.isSending) return;
                      openMenuFromBubble();
                    }}
                  >
                    <View style={chatStyles.opponentBubble}>
                    {msg.parent_content ? (
                      <ReplyQuote
                        chatStyles={chatStyles}
                        senderName={msg.parent_sender_name}
                        content={msg.parent_content}
                        onPress={() => onPressReplyTarget?.(msg.parent_message_id)}
                      />
                    ) : null}
                    {msg.images &&
                      msg.images.length > 0 &&
                      !msg.is_deleted &&
                      msg.images.map((uri, index) => (
                        <OptimizedImage
                          key={`${uri}-${index}`}
                          uri={uri}
                          onPress={() => onImagePress?.(uri)}
                          isSending={msg.isSending}
                        />
                      ))}
                    {msg.is_deleted ? (
                      <Text
                        style={[
                          chatStyles.opponentBubbleText,
                          {
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                          },
                        ]}
                      >
                        삭제된 메시지입니다.
                      </Text>
                    ) : msg.content ? (
                      <>
                        <Text
                          style={chatStyles.opponentBubbleText}
                          numberOfLines={
                            isExpanded ? undefined : (isLongMessage ? 4 : undefined)
                          }
                        >
                          {msg.content}
                        </Text>
                        {isLongMessage ? (
                          <TouchableOpacity
                            onPress={() => setIsExpanded((prev) => !prev)}
                            activeOpacity={0.8}
                          >
                            <Text style={chatStyles.chatTimeOpponent}>
                              {isExpanded ? '접기' : '전체보기'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
        {msg.showTimestamp === true ? (
          <Text
            style={[chatStyles.chatTimeOpponent, { marginLeft: normalize(7) }]}
          >
            {msg.time}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * @param {{
 *  msg: ChatMessage,
 *  chatStyles: any,
 *  normalize: Function,
 *  onRetry: Function,
 *  onDeleteMessage: Function,
 *  onImagePress: Function,
 *  onCopyMessage: Function,
 *  onReplyMessage: Function,
 *  onPressReplyTarget: Function,
 *  opponentName: string,
 *  onOpenLongPressMenu: Function
 * }} props
 */
const MessageItem = memo(
  ({
    msg,
    chatStyles,
    normalize,
    onRetry,
    onDeleteMessage,
    onImagePress,
    onCopyMessage,
    onReplyMessage,
    onPressReplyTarget,
    opponentName,
    onOpenLongPressMenu,
  }) => {
    if (msg.type === 'dateBanner') {
      return <DateBanner msg={msg} normalize={normalize} />;
    }

    const isImageOnly =
      msg.images && msg.images.length > 0 && !msg.content && !msg.is_deleted;

    // 내 메시지: 프로필 없음
    if (msg.isMe) {
      return (
        <MessageBubble
          msg={msg}
          chatStyles={chatStyles}
          normalize={normalize}
          onRetry={onRetry}
          onDeleteMessage={onDeleteMessage}
          onImagePress={onImagePress}
          onCopyMessage={onCopyMessage}
          onReplyMessage={onReplyMessage}
          onPressReplyTarget={onPressReplyTarget}
          opponentName={opponentName}
          onOpenLongPressMenu={onOpenLongPressMenu}
          isImageOnly={isImageOnly}
        />
      );
    }

    return (
      <View
        style={[
          chatStyles.chatRowOpponent,
          chatGroupRowMargins(msg, normalize),
        ]}
      >
        {msg.showProfile ? (
          <SenderProfile chatStyles={chatStyles} normalize={normalize} />
        ) : (
          <View style={chatStyles.chatProfileSpacer} pointerEvents="none" />
        )}
        <MessageBubble
          msg={msg}
          chatStyles={chatStyles}
          normalize={normalize}
          onRetry={onRetry}
          onDeleteMessage={onDeleteMessage}
          onImagePress={onImagePress}
          onCopyMessage={onCopyMessage}
          onReplyMessage={onReplyMessage}
          onPressReplyTarget={onPressReplyTarget}
          opponentName={opponentName}
          onOpenLongPressMenu={onOpenLongPressMenu}
          isImageOnly={isImageOnly}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    // chatStyles/normalize 참조 안정성 체크
    if (prevProps.chatStyles !== nextProps.chatStyles) return false;
    if (prevProps.normalize !== nextProps.normalize) return false;
    if (prevProps.onOpenLongPressMenu !== nextProps.onOpenLongPressMenu)
      return false;
    if (prevProps.onPressReplyTarget !== nextProps.onPressReplyTarget)
      return false;

    const pm = prevProps.msg;
    const nm = nextProps.msg;

    return (
      String(pm.id) === String(nm.id) &&
      pm.content === nm.content &&
      pm.parent_content === nm.parent_content &&
      pm.parent_sender_name === nm.parent_sender_name &&
      pm.is_deleted === nm.is_deleted &&
      pm.isSending === nm.isSending &&
      pm.isReadByOther === nm.isReadByOther &&
      pm.isReadByMe === nm.isReadByMe &&
      pm.showProfile === nm.showProfile &&
      pm.showTimestamp === nm.showTimestamp &&
      areImagesEqual(pm.images, nm.images)
    );
  },
);

export default MessageItem;
