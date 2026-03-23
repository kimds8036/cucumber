/**
 * 익명 우편함 화면 (React Native)
 * - Message.jsx 개인 우편함에서 우편 탭 시 route.params.mail 로 이 화면 진입 → 상세 표시
 * - mail 없이 진입 시 우편함 목록(MAILS) 표시, 항목 탭 시 상세로 이동
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';

// Message.jsx에서 넘어온 우편 형태 → 상세 화면용 형태로 통일
// content가 없으면 MAILS 더미데이터에서 id로 찾아서 채움
function toDetailMail(m) {
  if (!m) return null;
  const fromList = MAILS.find((mail) => mail.id === m.id);
  const isSentItem = m.isReceived === false;

  // 받은 우편(ㄴ): content = 상대가 보낸 우편
  // 보낸 우편(ㄱ): sentContent = 내가 보낸 우편, incomingReplyContent = 상대가 보낸 답장
  const sentContent = m.sentContent ?? fromList?.sentContent;
  const incomingReplyContent = m.incomingReplyContent ?? fromList?.incomingReplyContent;

  const content = isSentItem
    ? (sentContent || '(보낸 우편 내용이 없습니다.)')
    : (m.content || fromList?.content || '(편지 내용이 없습니다.)');

  // 받은 우편 화면에서의 "내가 보낸 답장"
  const replyContent = m.replyContent ?? fromList?.replyContent;
  const replyAt = m.replyAt ?? fromList?.replyAt;

  const viewMode =
    m.viewMode ??
    fromList?.viewMode ??
    (isSentItem ? (incomingReplyContent ? 'pair' : 'single') : (replyContent ? 'pair' : 'single'));

  return {
    id: m.id,
    receivedAt: m.receivedAt ?? m.time,
    preview: m.preview ?? fromList?.preview ?? (m.content ? `${String(m.content).slice(0, 30)}...` : ''),
    content,
    replied: m.replied ?? fromList?.replied ?? Boolean(replyContent),
    replyContent,
    replyAt,
    isUnread: m.isUnread ?? (m.unreadCount > 0),
    isReceived: m.isReceived ?? true,
    senderName: m.senderName ?? '익명',
    viewMode,
    sentContent: sentContent ?? null,
    incomingReplyContent: incomingReplyContent ?? null,
    incomingReplyAt: m.incomingReplyAt ?? fromList?.incomingReplyAt ?? null,
  };
}

// ─── 목록용 더미 데이터 (상세 진입 시에는 route.params.mail 사용) ───
const MAILS = [
  {
    id: 1,
    receivedAt: '2시간 전',
    preview: '오늘도 수고했어. 요즘 많이 힘들어 보이던데...',
    content: `오늘도 수고했어.\n\n요즘 많이 힘들어 보이던데 괜찮아?\n가끔 네 모습 보면 대단하다 싶어.\n\n그냥 한번쯤 전하고 싶었어.`,
    replied: false,
    isUnread: true,
  },
  {
    id: 2,
    receivedAt: '어제',
    preview: '항상 밝게 웃는 모습이 주변을 환하게 만들어.',
    content: `항상 밝게 웃는 모습이 주변을 환하게 만들어.\n그 에너지가 부러워서 편지 써봤어.\n\n그냥, 고마워.`,
    replied: true,
    replyContent: '누군지 모르지만 이런 편지 받으니까 정말 기뻤어. 고마워 :)',
    replyAt: '어제',
    isUnread: false,
    viewMode: 'pair',
  },
  {
    id: 3,
    receivedAt: '3일 전',
    preview: '네 글씨체가 진짜 예뻐. 수업 시간에 훔쳐본 거 들키지 않길.',
    content: `오랫동안 하고 싶었던 말인데\n네 글씨체가 진짜 예뻐.\n수업 시간에 필기 훔쳐본 거 들키지 않았길 바라며.`,
    replied: false,
    isUnread: false,
  },
  {
    id: 4,
    receivedAt: '방금',
    preview: '내가 보낸 우편 + 받은 답장 예시',
    // ㄱ(보낸 사람) 화면에서: 위(보낸 우편) + 아래(받은 답장)
    sentContent: '어제 편지 고마워! 나도 너한테 꼭 말해주고 싶었어 :)',
    incomingReplyContent: '나도 고마워. 다음에 같이 점심 먹자!',
    incomingReplyAt: '방금',
    replied: false,
    isUnread: true,
    viewMode: 'pair',
  },
];

// ─── 우편함 목록 ─────────────────────────────────────────────────────
function MailInbox({ onOpen, onBack }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="익명 우편함" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inboxContainer}
        showsVerticalScrollIndicator={false}
      >
        {MAILS.map((mail) => (
          <TouchableOpacity
            key={mail.id}
            style={[styles.mailCard, mail.isUnread && styles.mailCardUnread]}
            onPress={() => onOpen(mail)}
            activeOpacity={0.8}
          >
            <View style={styles.mailCardHeader}>
              <Text style={styles.anonLabel}>익명</Text>
              <Text style={styles.dotSep}>•</Text>
              <Text style={styles.mailTime}>{mail.receivedAt}</Text>
            </View>
            <Text style={styles.mailPreview} numberOfLines={1}>{mail.preview}</Text>
            <View style={styles.cardDivider} />
            <View style={styles.mailCardFooter}>
              {mail.replied ? (
                <View style={styles.replyStatus}>
                  <Text style={styles.replyStatusDoneText}>✓</Text>
                  <Text style={styles.replyStatusDoneText}>답장 완료</Text>
                </View>
              ) : (
                <View style={styles.replyStatus}>
                  <Text style={styles.replyStatusPendingText}>💬</Text>
                  <Text style={styles.replyStatusPendingText}>답장 가능</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 우편 상세 + 답장 모달/토스트 ─────────────────────────────────────
function MailDetail({ mail: initialMail, onBack, navigation }) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const [mail, setMail] = useState(initialMail);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);

  const availableHeight = Math.max(0, height - subHeaderHeight - bottomCtaHeight);
  const halfCardHeight = Math.max(240, Math.floor(availableHeight * 0.4));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View
        onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}
      >
        <SubHeader
          title={mail.isReceived === false ? '보낸 우편' : '받은 우편'}
          onBack={onBack}
          rightElement={(
            <View style={styles.historyIconWrapper}>
              <Octicons name="history" size={normalize(19)} color="black" />
            </View>
          )}
          onRightPress={() => navigation.navigate('AnonymousMailHistory', { threadId: mail?.id })}
        />
      </View>

      <View style={styles.detailRoot}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailLetterCard, { minHeight: halfCardHeight }]}>
            <View style={styles.detailSenderRow}>
              <View
                style={[
                  styles.detailAvatar,
                  mail.isReceived === false ? styles.detailAvatarMe : styles.detailAvatarOther,
                ]}
              />
              <View style={styles.detailSenderTexts}>
                <Text style={styles.detailSenderName}>
                  {mail.isReceived === false ? (mail.senderName || '상대') : '익명'}
                </Text>
                <Text style={styles.detailTime}>{mail.receivedAt}</Text>
              </View>
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>
                  {mail.isReceived === false ? '보낸 우편' : '받은 우편'}
                </Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.detailBody}>{mail.content}</Text>
            </ScrollView>
          </View>

          {/* 2번째 카드: 받은 우편이면 "내가 보낸 답장", 보낸 우편이면 "상대가 보낸 답장" */}
          {mail.viewMode === 'pair' && (
            <View style={[styles.detailLetterCard, { marginTop: 12, minHeight: halfCardHeight }]}>
              <View style={styles.detailSenderRow}>
                <View
                  style={[
                    styles.detailAvatar,
                    mail.isReceived === false ? styles.detailAvatarOther : styles.detailAvatarMe,
                  ]}
                />
                <View style={styles.detailSenderTexts}>
                  <Text style={styles.detailSenderName}>
                    {mail.isReceived === false ? (mail.senderName || '상대') : '나'}
                  </Text>
                  <Text style={styles.detailTime}>
                    {mail.isReceived === false ? (mail.incomingReplyAt || '방금') : (mail.replyAt || '방금')}
                  </Text>
                </View>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>
                    {mail.isReceived === false ? '받은 답장' : '보낸 답장'}
                  </Text>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailBody}>
                  {mail.isReceived === false ? (mail.incomingReplyContent || '(아직 답장이 도착하지 않았어요.)') : (mail.replyContent || '')}
                </Text>
              </ScrollView>
            </View>
          )}

          
        </ScrollView>

        <View
          style={styles.bottomCtaWrapper}
          onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
        >
          {mail.isReceived !== false &&
          mail.viewMode === 'pair' &&
          mail.replyContent ? (
            <Text style={styles.bottomWaitingText}>
              상대방에게 답장이 오면 알려드릴게요
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.bottomCtaButton}
              onPress={() =>
                navigation.navigate('AnonymousMailReply', {
                  mail,
                  onSent: (replyText) => {
                    setMail((prev) => ({
                      ...prev,
                      replied: true,
                      replyContent: replyText,
                      replyAt: '방금',
                      viewMode: 'pair',
                    }));
                  },
                })
              }
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>답장하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── 루트: 네비게이션 연동 ─────────────────────────────────────────────
export default function AnonymousMailScreen({ navigation, route }) {
  const mailParam = route.params?.mail;
  const detailMail = useMemo(() => toDetailMail(mailParam), [mailParam]);

  if (detailMail) {
    return (
      <MailDetail
        mail={detailMail}
        onBack={() => navigation.goBack()}
        navigation={navigation}
      />
    );
  }

  return (
    <MailInbox
      onBack={() => navigation.goBack()}
      onOpen={(mail) => navigation.navigate('MailDetail', { mail: toDetailMail(mail) || mail })}
    />
  );
}
