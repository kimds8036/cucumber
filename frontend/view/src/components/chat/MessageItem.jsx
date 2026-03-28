import React, { memo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../../../styles/colors';
import MessageTabIcon from '../../../../assets/Group 166.svg';
import { showMessageLongPressMenu } from '../../utils/chatMenuUtils';

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
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      >
        <ActivityIndicator color="#fff" />
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
 */

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
      width={normalize(28)}
      height={normalize(28)}
      color={colors.green}
    />
  </View>
);

const ReplyQuote = ({ chatStyles, senderName, content }) => (
  <View style={chatStyles.replyQuoteBox}>
    <Text style={chatStyles.replyQuoteSender}>
      {senderName ? senderName : '답장'}
    </Text>
    <Text style={chatStyles.replyQuoteText} numberOfLines={2}>
      {content}
    </Text>
  </View>
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
  isImageOnly,
}) => {
  // 내 메시지
  if (msg.isMe) {
    return (
      <View style={chatStyles.chatRowUser}>
        <View style={chatStyles.userBubbleAndTime}>
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
                  <Text style={chatStyles.chatTimeUser}>
                    {msg.status === 'sending' || msg.isSending
                      ? '...'
                      : msg.time}
                  </Text>
                </View>
              </>
            )}
          </View>
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
              showMessageLongPressMenu(
                msg,
                onCopyMessage,
                onDeleteMessage,
                onReplyMessage,
              );
            }}
            activeOpacity={0.8}
          >
            {/* 답장 인용구 (카카오톡 스타일) */}
            {msg.parent_content ? (
              <ReplyQuote
                chatStyles={chatStyles}
                senderName={msg.parent_sender_name}
                content={msg.parent_content}
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
              <Text style={chatStyles.userBubbleText}>{msg.content}</Text>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 상대방 메시지
  return (
    <View style={chatStyles.opponentNameAndBubble}>
      <Text style={chatStyles.opponentName}>익명</Text>

      {/* 이미지 전용(말풍선 없음) */}
      {isImageOnly ? (
        <Pressable
          onLongPress={() => {
            if (msg.is_deleted || msg.isSending) return;
            showMessageLongPressMenu(
              msg,
              onCopyMessage,
              onDeleteMessage,
              onReplyMessage,
            );
          }}
        >
          <View style={{ alignItems: 'flex-start' }}>
            {msg.parent_content ? (
              <ReplyQuote
                chatStyles={chatStyles}
                senderName={msg.parent_sender_name}
                content={msg.parent_content}
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
      ) : (
        // 텍스트(또는 삭제 메시지)인 경우: Pressable로 long-press 처리
        <>
          {msg.content || msg.is_deleted ? (
            <Pressable
              onLongPress={() => {
                if (msg.is_deleted || msg.isSending) return;
                showMessageLongPressMenu(
                  msg,
                  onCopyMessage,
                  onDeleteMessage,
                  onReplyMessage,
                );
              }}
            >
              <View style={chatStyles.opponentBubble}>
                {msg.parent_content ? (
                  <ReplyQuote
                    chatStyles={chatStyles}
                    senderName={msg.parent_sender_name}
                    content={msg.parent_content}
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
                  <Text style={chatStyles.opponentBubbleText}>
                    {msg.content}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </>
      )}

      {/* 시간 표시는 이미지/말풍선 아래쪽 */}
      <View style={chatStyles.opponentTimeRow}>
        <Text style={chatStyles.chatTimeOpponent}>{msg.time}</Text>
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
 *  onReplyMessage: Function
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
          isImageOnly={isImageOnly}
        />
      );
    }

    return (
      <View
        style={[
          chatStyles.chatRowOpponent,
          { flexDirection: 'row', alignItems: 'flex-start' },
        ]}
      >
        <SenderProfile chatStyles={chatStyles} normalize={normalize} />
        <MessageBubble
          msg={msg}
          chatStyles={chatStyles}
          normalize={normalize}
          onRetry={onRetry}
          onDeleteMessage={onDeleteMessage}
          onImagePress={onImagePress}
          onCopyMessage={onCopyMessage}
          onReplyMessage={onReplyMessage}
          isImageOnly={isImageOnly}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    // chatStyles/normalize 참조 안정성 체크
    if (prevProps.chatStyles !== nextProps.chatStyles) return false;
    if (prevProps.normalize !== nextProps.normalize) return false;

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
      areImagesEqual(pm.images, nm.images)
    );
  },
);

export default MessageItem;
