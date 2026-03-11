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
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';

// Message.jsx에서 넘어온 우편 형태 → 상세 화면용 형태로 통일
// content가 없으면 MAILS 더미데이터에서 id로 찾아서 채움
function toDetailMail(m) {
  if (!m) return null;
  const fromList = MAILS.find((mail) => mail.id === m.id);
  return {
    id: m.id,
    receivedAt: m.receivedAt ?? m.time,
    preview: m.preview ?? fromList?.preview ?? (m.content ? `${String(m.content).slice(0, 30)}...` : ''),
    content: m.content || fromList?.content || '(편지 내용이 없습니다.)',
    replied: m.replied ?? fromList?.replied ?? false,
    replyContent: m.replyContent ?? fromList?.replyContent,
    replyAt: m.replyAt ?? fromList?.replyAt,
    isUnread: m.isUnread ?? (m.unreadCount > 0),
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
  },
  {
    id: 3,
    receivedAt: '3일 전',
    preview: '네 글씨체가 진짜 예뻐. 수업 시간에 훔쳐본 거 들키지 않길.',
    content: `오랫동안 하고 싶었던 말인데\n네 글씨체가 진짜 예뻐.\n수업 시간에 필기 훔쳐본 거 들키지 않았길 바라며.`,
    replied: false,
    isUnread: false,
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
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const [mail, setMail] = useState(initialMail);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="받은 우편" onBack={onBack} />

      <View style={styles.detailRoot}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailLetterCard}>
            <View style={styles.detailSenderRow}>
              <View style={styles.detailAvatar} />
              <View style={styles.detailSenderTexts}>
                <Text style={styles.detailSenderName}>익명</Text>
                <Text style={styles.detailTime}>{mail.receivedAt}</Text>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <Text style={styles.detailBody}>{mail.content}</Text>
          </View>

          {mail.replied && mail.replyContent && (
            <View style={[styles.detailLetterCard, { marginTop: 12 }]}>
              <View style={styles.detailSenderRow}>
                <View style={styles.detailAvatar} />
                <View style={styles.detailSenderTexts}>
                  <Text style={styles.detailSenderName}>나</Text>
                  <Text style={styles.detailTime}>{mail.replyAt}</Text>
                </View>
              </View>
              <View style={styles.detailDivider} />
              <Text style={styles.detailBody}>{mail.replyContent}</Text>
            </View>
          )}

          <Text style={styles.detailNotice}>답장은 1번만 가능해요</Text>
        </ScrollView>

        {!mail.replied && (
          <View style={styles.bottomCtaWrapper}>
            <TouchableOpacity
              style={styles.bottomCtaButton}
              onPress={() => navigation.navigate('MailReply', { mail })}
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>답장하기</Text>
            </TouchableOpacity>
          </View>
        )}
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
