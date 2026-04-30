import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import SubHeader from '../frame/subHeader';
import Skeleton from '../../components/common/Skeleton';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import ProfileIcon from '../../assets/Profile.svg';
import { getProfileInnerColor } from '../../utils/profileIconColor';

function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatListTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

function extractMailListFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data?.mails)) return data.mails;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.mails)) return payload.mails;
  return [];
}

/** 스레드에서 해당 메시지가 '내가 보낸 우편'에 대한 답장인지 (부모 발신자가 나) */
export function replyToMySentFromThread(message, threadMessages, currentUserId) {
  if (!message || !Array.isArray(threadMessages)) return false;
  const me = Number(currentUserId);
  if (!Number.isFinite(me)) return false;
  const pid = message.parent_mail_id;
  if (pid == null) return false;
  const parent = threadMessages.find((msg) => Number(msg.id) === Number(pid));
  if (!parent) return false;
  return Number(parent.sender_id) === me;
}

function pickLatestThreadMessage(myMsg, otherMsg) {
  if (myMsg && otherMsg) {
    const mt = parseUtcToLocal(myMsg.created_at);
    const ot = parseUtcToLocal(otherMsg.created_at);
    if (mt && ot) return mt >= ot ? myMsg : otherMsg;
    if (mt) return myMsg;
    if (ot) return otherMsg;
    return myMsg || otherMsg;
  }
  return myMsg || otherMsg || null;
}

/**
 * 발신자 표기: 내가 보낸 경우 실명, 상대가 첫 우편이면 익명,
 * 내가 보낸 우편에 대한 답장(replyToMySent)이면 상대 실명.
 */
export function senderDisplayNameForCurrentUser({
  senderId,
  senderNameFromApi,
  currentUserId,
  myDisplayName,
  replyToMySent = false,
}) {
  const sid = Number(senderId);
  const me = Number(currentUserId);
  if (!Number.isFinite(sid) || !Number.isFinite(me)) {
    return null;
  }
  if (sid === me) {
    const fromApi =
      senderNameFromApi != null && String(senderNameFromApi).trim()
        ? String(senderNameFromApi).trim()
        : '';
    return fromApi || (myDisplayName && String(myDisplayName).trim()) || '나';
  }
  if (replyToMySent) {
    const fromApi =
      senderNameFromApi != null && String(senderNameFromApi).trim()
        ? String(senderNameFromApi).trim()
        : '';
    return fromApi || '익명';
  }
  return '익명';
}

export function counterpartyDisplayNameForCurrentUser({
  isReceived,
  senderNameFromApi,
  recipientNameFromApi,
  isRootAuthorForCurrentUser = false,
}) {
  if (!isRootAuthorForCurrentUser) {
    console.log('[MailLabelDecision][Helper]', {
      isReceived,
      isRootAuthorForCurrentUser,
      senderNameFromApi: senderNameFromApi ?? null,
      recipientNameFromApi: recipientNameFromApi ?? null,
      decidedLabel: '익명',
    });
    return '익명';
  }

  const knownSender =
    senderNameFromApi != null && String(senderNameFromApi).trim()
      ? String(senderNameFromApi).trim()
      : '';
  const knownRecipient =
    recipientNameFromApi != null && String(recipientNameFromApi).trim()
      ? String(recipientNameFromApi).trim()
      : '';
  // 첫 메일을 내가 시작한 스레드는 항상 실명 고정.
  const decided = knownSender || knownRecipient || '익명';
  console.log('[MailLabelDecision][Helper]', {
    isReceived,
    isRootAuthorForCurrentUser,
    senderNameFromApi: senderNameFromApi ?? null,
    recipientNameFromApi: recipientNameFromApi ?? null,
    labelSource: 'firstMail',
    decidedLabel: decided,
  });
  return decided;
}

function extractPaginationFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  return data?.pagination || payload?.pagination || null;
}

function mapMailToListItem(mail, isReceived) {
  const profileColorId =
    (isReceived
      ? mail.sender_color_id
      : mail.recipient_color_id) ??
    mail.profile_color_id ??
    mail.profileColorId ??
    null;
  return {
    id: mail.id,
    roomId: mail.room_id ?? null,
    raw: mail,
    isReceived,
    parentMailId: mail.parent_mail_id != null ? mail.parent_mail_id : null,
    threadKey: Number(mail.thread_key != null ? mail.thread_key : (mail.root_mail_id != null ? mail.root_mail_id : mail.id)),
    createdAt: mail.created_at,
    counterpartyUserId: isReceived ? mail.sender_id : mail.recipient_id,
    preview: String(mail.content || '').slice(0, 40),
    receivedAt: formatListTime(mail.created_at),
    isUnread: isReceived ? !mail.is_read : false,
    replyToMySent: Boolean(mail.reply_to_my_sent ?? mail.replyToMySent),
    profileColorId,
  };
}

function MailInbox({ onOpen, onBack, navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);
  const [tab, setTab] = useState('received');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchList = useCallback(async (nextPage = 1, append = false) => {
    try {
      if (nextPage === 1 && !append) setLoading(true);
      setError('');
      const isReceived = tab === 'received';
      const endpoint = isReceived ? '/api/mails/personal/received' : '/api/mails/personal/sent';
      const res = await api.get(endpoint, { params: { page: nextPage, limit: 20 } });
      const mails = extractMailListFromResponse(res);
      const pagination = extractPaginationFromResponse(res);
      const mapped = mails.map((mail) => mapMailToListItem(mail, isReceived));
      let displayItems = mapped;

      if (!isReceived) {
        // 보낸 우편은 thread_key 기준 병합을 하지 않고, 발송 단위(행)로만 노출한다.
        displayItems = mapped
          .slice()
          .sort((a, b) => {
            const ad = parseUtcToLocal(a.createdAt);
            const bd = parseUtcToLocal(b.createdAt);
            if (!ad || !bd) return 0;
            return bd - ad;
          })
          .map((m) => ({ ...m, rowKind: 'normal' }));
      }
      const totalPages = Number(pagination?.totalPages || 1);

      setItems((prev) => (append ? [...prev, ...displayItems] : displayItems));
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch (e) {
      setError(e.response?.data?.message || '우편함을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      if (nextPage === 1 && !append) setIsInitialLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList(1, false);
  }, [fetchList]);

  if (isInitialLoading && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1, paddingHorizontal: normalize(14), paddingTop: normalize(10) }}>
          {[0, 1, 2].map((idx) => (
            <View key={`mail-list-skel-${idx}`} style={styles.mailCard}>
              <View style={styles.mailCardHeader}>
                <Skeleton width={normalize(66)} height={normalize(12)} borderRadius={normalize(6)} />
                <Skeleton width={normalize(48)} height={normalize(11)} borderRadius={normalize(6)} />
              </View>
              <Skeleton width="92%" height={normalize(14)} borderRadius={normalize(6)} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title="익명 우편함"
        onBack={onBack}
        rightElement={
          <Octicons name="history" size={normalize(22)} color={colors.textPrimary} />
        }
        onRightPress={() => navigation?.navigate('MailHistory')}
      />
      <View style={styles.inboxTabRow}>
        <TouchableOpacity
          style={[
            styles.inboxTabButton,
            tab === 'received' ? styles.inboxTabButtonReceivedActive : styles.inboxTabButtonInactive,
          ]}
          onPress={() => setTab('received')}
        >
          <Text
            style={[
              styles.inboxTabButtonText,
              tab === 'received' && styles.inboxTabButtonTextActive,
            ]}
          >
            받은 우편
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.inboxTabButton,
            tab === 'sent' ? styles.inboxTabButtonSentActive : styles.inboxTabButtonInactive,
          ]}
          onPress={() => setTab('sent')}
        >
          <Text
            style={[
              styles.inboxTabButtonText,
              tab === 'sent' && styles.inboxTabButtonTextActive,
            ]}
          >
            보낸 우편
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inboxContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.inboxStateWrapper}>
            <Skeleton width={normalize(18)} height={normalize(18)} borderRadius={normalize(9)} />
          </View>
        )}
        {!loading && !!error && (
          <View style={styles.inboxStateWrapper}>
            <Text style={styles.inboxErrorText}>{error}</Text>
          </View>
        )}
        {!loading && !error && items.length === 0 && (
          <View style={styles.inboxStateWrapper}>
            <Text>우편이 없습니다.</Text>
          </View>
        )}
        {items.map((mail) => {
          const iconColor = getProfileInnerColor(mail.profileColorId);
          return (
            <TouchableOpacity
              key={mail.listKey || String(mail.id)}
              style={[
                styles.mailCard,
                mail.isUnread && styles.mailCardUnread,
                mail.rowKind === 'parent' && styles.mailCardParent,
                mail.rowKind === 'reply' && styles.mailCardReply,
              ]}
              onLongPress={() => {
                const counterpartyUserId = mail.counterpartyUserId;
                Alert.alert('개인 우편 옵션', '원하는 작업을 선택해주세요.', [
                  {
                    text: '차단',
                    style: 'destructive',
                    onPress: async () => {
                      if (!counterpartyUserId) return;
                      try {
                        await api.post(`/api/friends/${counterpartyUserId}/block`, {
                          reason: 'mail_block',
                        });
                        if (mail.roomId) {
                          setItems((prev) => prev.filter((it) => it.roomId !== mail.roomId));
                        }
                      } catch {
                        Alert.alert('오류', '차단 처리에 실패했습니다.');
                      }
                    },
                  },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                      if (!mail.roomId) return;
                      try {
                        await api.delete(`/api/mails/personal/rooms/${mail.roomId}`);
                        setItems((prev) => prev.filter((it) => it.roomId !== mail.roomId));
                      } catch {
                        Alert.alert('오류', '우편 삭제에 실패했습니다.');
                      }
                    },
                  },
                  { text: '취소', style: 'cancel' },
                ]);
              }}
              onPress={() => onOpen(mail)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginRight: normalize(10), justifyContent: 'center' }}>
                  <ProfileIcon
                    width={normalize(30)}
                    height={normalize(30)}
                    color={iconColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.mailCardHeader}>
                    <Text style={styles.anonLabel}>
                      {mail.rowKind === 'parent'
                        ? '원본 우편'
                        : counterpartyDisplayNameForCurrentUser({
                            isReceived: Boolean(mail.isReceived),
                            senderNameFromApi: mail.raw?.sender_name,
                            recipientNameFromApi: mail.raw?.recipient_name,
                            isRootAuthorForCurrentUser: Boolean(
                              mail.raw?.is_root_author_for_current_user
                            ),
                          })}
                    {mail.rowKind !== 'parent' &&
                      console.log('[MailLabelDecision][MailInboxRow]', {
                        mailId: mail.raw?.id ?? mail.id,
                        rowKind: mail.rowKind ?? 'normal',
                        isReceived: Boolean(mail.isReceived),
                        isRootAuthorForCurrentUser: Boolean(
                          mail.raw?.is_root_author_for_current_user
                        ),
                        senderNameFromApi: mail.raw?.sender_name ?? null,
                        recipientNameFromApi: mail.raw?.recipient_name ?? null,
                      })}
                    </Text>
                    <Text style={styles.dotSep}>•</Text>
                    <Text style={styles.mailTime}>{mail.receivedAt}</Text>
                  </View>
                  <Text style={styles.mailPreview} numberOfLines={1}>{mail.preview}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {!loading && hasMore && (
          <TouchableOpacity
            style={styles.inboxLoadMoreButton}
            onPress={() => fetchList(page + 1, true)}
          >
            <Text style={styles.inboxLoadMoreText}>더 불러오기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation?.navigate('SendMail')}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MailDetail({ mail: initialMail, onBack, navigation }) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const { refreshHasUnread } = useNotification();

  const historyThreadId = useMemo(() => {
    const tk =
      initialMail?.thread_key ??
      initialMail?.threadKey ??
      initialMail?.root_mail_id ??
      initialMail?.id;
    const n = Number(tk);
    return Number.isFinite(n) ? n : undefined;
  }, [
    initialMail?.id,
    initialMail?.thread_key,
    initialMail?.threadKey,
    initialMail?.root_mail_id,
  ]);

  const [threadRootId, setThreadRootId] = useState(historyThreadId ?? null);
  const [mail, setMail] = useState(null);
  const [myName, setMyName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [latestMyReply, setLatestMyReply] = useState(null);
  const [latestOtherReply, setLatestOtherReply] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const singleCardMinHeight = Math.max(240, Math.round(height * 0.7));

  const fetchDetail = useCallback(async () => {
    if (!initialMail?.id) return;
    try {
      setLoading(true);
      setError('');
      const [detailRes, meRes, threadRes] = await Promise.all([
        api.get(`/api/mails/personal/${initialMail.id}`),
        api.get('/api/auth/me'),
        api.get(`/api/mails/personal/${initialMail.id}/thread`).catch(() => null),
      ]);
      const m = detailRes.data?.data;
      const me = meRes.data?.data;
      const meId = Number(me?.id != null ? me?.id : me?.userId);
      const computedThreadRootId = Number(m?.root_mail_id ?? m?.id);
      const meDisplayName = me?.name || me?.username || '나';
      const threadMsgs = threadRes?.data?.data?.messages || [];
      const myLatestSent =
        threadMsgs
          .filter((msg) => Number(msg.sender_id) === meId)
          .sort((a, b) => {
            const ad = parseUtcToLocal(a.created_at);
            const bd = parseUtcToLocal(b.created_at);
            if (!ad || !bd) return 0;
            return bd - ad;
          })[0] || null;
      const otherLatestSent =
        threadMsgs
          .filter((msg) => Number(msg.sender_id) !== meId)
          .sort((a, b) => {
            const ad = parseUtcToLocal(a.created_at);
            const bd = parseUtcToLocal(b.created_at);
            if (!ad || !bd) return 0;
            return bd - ad;
          })[0] || null;

      setMyName(meDisplayName);
      setCurrentUserId(Number.isFinite(meId) ? meId : null);
      setLatestMyReply(myLatestSent);
      setLatestOtherReply(otherLatestSent);
      setThreadMessages(Array.isArray(threadMsgs) ? threadMsgs : []);
      setMail({
        id: m.id,
        receivedAt: formatListTime(m.created_at),
        content: m.content || '',
        isReceived: initialMail?.isReceived != null ? initialMail?.isReceived : true,
        senderId: m.sender_id,
        senderName: m.sender_name || '익명',
        recipientName: m.recipient_name || '',
        senderColorId: m.sender_color_id != null ? m.sender_color_id : null,
        recipientColorId: m.recipient_color_id != null ? m.recipient_color_id : null,
        counterpartyUserId:
          (initialMail?.isReceived != null ? initialMail?.isReceived : true) ? m.sender_id : m.recipient_id,
        replyToMySent: Boolean(
          m.reply_to_my_sent ?? m.replyToMySent ?? initialMail?.replyToMySent
        ),
        isRootAuthorForCurrentUser: Boolean(
          m.is_root_author_for_current_user ??
          initialMail?.is_root_author_for_current_user ??
          initialMail?.isRootAuthorForCurrentUser
        ),
      });

      if (Number.isFinite(computedThreadRootId)) {
        setThreadRootId(computedThreadRootId);
      }
    } catch (e) {
      setError(e.response?.data?.message || '우편 상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [initialMail?.id, initialMail?.replyToMySent]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 알림센터를 거치지 않고 우편 내용을 확인했을 때,
  // personal_mail 스레드 관련 알림을 지속적으로 읽음 처리해서
  // 헤더 빨간 점과 알림 내역이 즉시 동기화되도록 한다.
  useEffect(() => {
    if (!threadRootId) return;

    let cancelled = false;

    const markThreadRead = async () => {
      try {
        await api.post('/api/notifications/read-personal-mail-thread', {
          threadRootId,
        });
      } catch (e) {
        // 네트워크/서버 오류 시에도 화면 동작은 유지
      } finally {
        if (!cancelled) refreshHasUnread?.();
      }
    };

    // 즉시 1회 처리
    void markThreadRead();

    // 체류 중 새 알림이 도착하면 interval 다음 루프에서 바로 반영
    const t = setInterval(() => {
      void markThreadRead();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [threadRootId, refreshHasUnread]);

  const threadLatest = pickLatestThreadMessage(latestMyReply, latestOtherReply);
  const singleBody =
    threadLatest?.content ?? (mail?.content != null ? mail.content : '') ?? '';
  const singleTimeLabel = threadLatest?.created_at
    ? formatListTime(threadLatest.created_at)
    : mail?.receivedAt ?? '';
  const isDisplayMine = threadLatest
    ? threadLatest === latestMyReply
    : mail?.isReceived === false;
  const detailOtherColorId = mail?.isReceived ? mail?.senderColorId : mail?.recipientColorId;
  const detailMyColorId = mail?.isReceived ? mail?.recipientColorId : mail?.senderColorId;
  const detailIconColor = getProfileInnerColor(isDisplayMine ? detailMyColorId : detailOtherColorId);

  const counterpartyKnownName =
    mail?.isReceived === true
      ? (threadMessages.find((msg) => Number(msg.sender_id) !== Number(currentUserId))?.sender_name || mail?.senderName)
      : (mail?.recipientName || '');
  const cardSenderLabel = isDisplayMine
    ? '나'
    : counterpartyDisplayNameForCurrentUser({
        isReceived: true,
        senderNameFromApi: counterpartyKnownName,
        recipientNameFromApi: mail?.recipientName,
        isRootAuthorForCurrentUser: Boolean(mail?.isRootAuthorForCurrentUser),
      });
  console.log('[MailLabelDecision][MailDetail]', {
    mailId: mail?.id ?? initialMail?.id ?? null,
    isReceived: Boolean(mail?.isReceived),
    isRootAuthorForCurrentUser: Boolean(mail?.isRootAuthorForCurrentUser),
    isDisplayMine,
    counterpartyKnownName: counterpartyKnownName || null,
    recipientNameFromApi: mail?.recipientName ?? null,
    decidedLabel: cardSenderLabel,
  });

  // 보낸 우편 흐름에서, 상자에 보이는 최신 글이 내 것일 때(상대가 아직 답하지 않음)
  const showWaitingForReply =
    mail?.isReceived === false && isDisplayMine;
  const showReplyCta = mail?.isReceived === true && !isDisplayMine;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SubHeader
          title={mail?.isReceived === false ? '보낸 우편' : '받은 우편'}
          onBack={onBack}
          rightElement={
            <Octicons name="history" size={normalize(18)} color={colors.textPrimary} />
          }
          onRightPress={() =>
            navigation.navigate('MailHistory', {
              ...(historyThreadId != null ? { threadId: historyThreadId } : {}),
            })
          }
        />
        <View style={styles.detailRoot}>
          <View style={{ flex: 1, paddingHorizontal: normalize(16), paddingTop: normalize(16) }}>
            <View style={[styles.detailLetterCard, { minHeight: singleCardMinHeight }]}>
              <Skeleton width={normalize(84)} height={normalize(12)} borderRadius={normalize(6)} style={{ marginBottom: normalize(8) }} />
              <Skeleton width="100%" height={normalize(14)} borderRadius={normalize(6)} style={{ marginBottom: normalize(6) }} />
              <Skeleton width="92%" height={normalize(14)} borderRadius={normalize(6)} style={{ marginBottom: normalize(6) }} />
              <Skeleton width="74%" height={normalize(14)} borderRadius={normalize(6)} style={{ marginBottom: normalize(12) }} />
              <View style={{ flexDirection: 'row', gap: normalize(12) }}>
                <Skeleton width={normalize(30)} height={normalize(12)} borderRadius={normalize(6)} />
                <Skeleton width={normalize(30)} height={normalize(12)} borderRadius={normalize(6)} />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title={mail?.isReceived === false ? '보낸 우편' : '받은 우편'}
        onBack={onBack}
        rightElement={
          <Octicons name="history" size={normalize(18)} color={colors.textPrimary} />
        }
        onRightPress={() =>
          navigation.navigate('MailHistory', {
            ...(historyThreadId != null ? { threadId: historyThreadId } : {}),
          })
        }
      />

      <View style={styles.detailRoot}>
        {!!error && (
          <Text style={styles.detailErrorText}>{error}</Text>
        )}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.detailScroll,
            { flexGrow: 1, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.detailLetterCard,
              {
                minHeight: singleCardMinHeight,
              },
            ]}
          >
            {isDisplayMine ? (
              <>
                <View style={styles.detailSenderRow}>
                  <View style={[styles.detailAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ProfileIcon
                      width={normalize(28)}
                      height={normalize(28)}
                      color={detailIconColor}
                    />
                  </View>
                  <View style={styles.detailSenderTexts}>
                    <Text style={styles.detailSenderName}>{cardSenderLabel}</Text>
                    <Text style={styles.detailTime}>{singleTimeLabel}</Text>
                  </View>
                </View>
                <View style={styles.detailReplyBodyContainer}>
                  <Text style={styles.detailBody}>{singleBody}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailSenderRow}>
                  <View style={[styles.detailAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ProfileIcon
                      width={normalize(28)}
                      height={normalize(28)}
                      color={detailIconColor}
                    />
                  </View>
                  <View style={styles.detailSenderTexts}>
                    <Text style={styles.detailSenderName}>{cardSenderLabel}</Text>
                    <Text style={styles.detailTime}>{singleTimeLabel}</Text>
                  </View>
                </View>
                <View style={styles.detailBodyContainer}>
                  <Text style={styles.detailBody}>{singleBody}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomCtaWrapper}>
          {showWaitingForReply ? (
            <Text style={styles.bottomWaitingText}>
              상대방의 답장을 기다리고 있어요
            </Text>
          ) : showReplyCta ? (
            <TouchableOpacity
              style={styles.bottomCtaButton}
              onPress={() =>
                navigation.navigate('MailReply', {
                  mail: {
                    id: initialMail?.id,
                    content: mail?.content,
                    receivedAt: mail?.receivedAt,
                    senderLabel: cardSenderLabel,
                    profileColorId: detailOtherColorId,
                  },
                  onSent: () => fetchDetail(),
                })
              }
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>답장하기</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function AnonymousMailScreen({ navigation, route }) {
  const detailMail = route.params?.mail;
  const fallbackRelatedId = route.params?.relatedId;
  const mailForDetail =
    detailMail?.raw != null
      ? {
          ...detailMail.raw,
          isReceived: detailMail.isReceived,
          replyToMySent: detailMail.replyToMySent,
        }
      : (detailMail || {
          id: fallbackRelatedId,
          isReceived: true,
          replyToMySent: false,
        });

  return (
    <MailDetail
      mail={mailForDetail}
      onBack={() => navigation.goBack()}
      navigation={navigation}
    />
  );

  /*
  // Legacy 분기 (목록 모드): MailDetail 단일 진입으로 통일하여 현재 미사용
  return (
    <MailInbox
      navigation={navigation}
      onBack={() => navigation.goBack()}
      onOpen={(mail) => navigation.navigate('MailDetail', { mail })}
    />
  );
  */
}
