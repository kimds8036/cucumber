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
  Modal,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

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
              <Text style={styles.anonLabel}>익명의 누군가</Text>
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
function MailDetail({ mail: initialMail, onBack }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const [mail, setMail] = useState(initialMail);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    setShowModal(false);
    setShowToast(true);
    setMail({ ...mail, replied: true, replyContent: replyText.trim(), replyAt: '방금 전' });
    setReplyText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="익명 우편" onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.detailScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.letterCard}>
          <View style={styles.letterAuthorRow}>
            <Text style={styles.letterAuthor}>익명의 누군가</Text>
            <Text style={styles.dotSep}>•</Text>
            <Text style={styles.letterTime}>{mail.receivedAt}</Text>
          </View>
          <Text style={styles.letterBody}>{mail.content}</Text>
          <View style={styles.letterDivider} />
          <View style={styles.letterAnonNote}>
            <Text style={styles.anonNoteText}>보내는 사람</Text>
            <View style={styles.anonBadge}>
              <Text style={styles.anonBadgeText}>ANONYMOUS</Text>
            </View>
            <Text style={styles.anonNoteSub}>받는 사람만 공개됨</Text>
          </View>
        </View>

        {mail.replied ? (
          <View style={styles.repliedCard}>
            <View style={styles.repliedCardHeader}>
              <View style={styles.repliedLabel}>
                <Text style={styles.repliedLabelGreen}>✓</Text>
                <Text style={styles.repliedLabelGreen}>내가 보낸 답장</Text>
              </View>
              <Text style={styles.repliedAt}>{mail.replyAt}</Text>
            </View>
            <View style={styles.repliedDivider} />
            <Text style={styles.repliedBody}>{mail.replyContent}</Text>
            <View style={styles.repliedSub}>
              <Text>ℹ</Text>
              <Text style={styles.repliedSubText}>상대방은 내가 누군지 알 수 있어요</Text>
            </View>
          </View>
        ) : (
          <View style={styles.replyCtaCard}>
            <View style={styles.replyCtaTop}>
              <Text style={styles.replyCtaTitle}>💬 답장하기</Text>
              <View style={styles.onceBadge}>
                <Text style={styles.onceBadgeText}>1회만 가능</Text>
              </View>
            </View>
            <Text style={styles.replyCtaDesc}>
              상대방이 누군지는 알 수 없어요.{'\n'}단, 답장을 보내면 상대방은 내가 누군지 알게 됩니다.
            </Text>
            <View style={styles.warnBox}>
              <Text style={styles.warnBoxText}>
                ⚠ 답장은 단 1회만 전송할 수 있으며,{'\n'}전송 후 수정·취소가 불가합니다.
              </Text>
            </View>
            <TouchableOpacity style={styles.replyBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
              <Text style={styles.replyBtnText}>답장 작성하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 답장 작성 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalDrag} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✉ 답장 작성</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalWarnInline}>
              <Text style={styles.modalWarnText}>⚠ 이 답장은 1회만 전송 가능. 전송 후 수정·취소 불가.</Text>
            </View>
            <TextInput
              style={styles.modalTextarea}
              placeholder="익명에게 답장을 써주세요..."
              placeholderTextColor={colors.textSecondary}
              value={replyText}
              onChangeText={setReplyText}
              maxLength={300}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalBottom}>
              <Text style={styles.charCount}>{replyText.length} / 300</Text>
              <TouchableOpacity
                style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!replyText.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.sendBtnText}>전송하기 →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 전송 완료 토스트 */}
      <Modal visible={showToast} transparent animationType="fade">
        <View style={styles.toastOverlay}>
          <View style={styles.toastCard}>
            <Text style={styles.toastIcon}>📮</Text>
            <Text style={styles.toastTitle}>답장을 보냈어요</Text>
            <Text style={styles.toastDesc}>
              익명의 상대에게 전달됐습니다.{'\n'}상대방은 이제 내가 누군지 알 수 있어요.{'\n\n'}이 편지에 더 이상 답장할 수 없어요.
            </Text>
            <TouchableOpacity style={styles.toastOk} onPress={() => setShowToast(false)} activeOpacity={0.8}>
              <Text style={styles.toastOkText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8F9FA' },
    scroll: { flex: 1 },
    inboxContainer: { padding: normalize(12), paddingBottom: normalize(20), gap: normalize(8) },
    mailCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(8),
      borderWidth: 1,
      borderColor: colors.textLight10,
      position: 'relative',
    },
    mailCardUnread: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    mailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(8) },
    anonLabel: { fontSize: normalize(13), fontFamily: fonts.bold, color: colors.textPrimary },
    dotSep: { fontSize: normalize(13), color: colors.textSecondary },
    mailTime: { fontSize: normalize(12), color: colors.textSecondary },
    mailPreview: { fontSize: normalize(14), color: colors.textSecondary, marginBottom: normalize(10) },
    cardDivider: { height: 1, backgroundColor: colors.textLight10, marginBottom: normalize(10) },
    mailCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    replyStatus: { flexDirection: 'row', alignItems: 'center', gap: normalize(5) },
    replyStatusDoneText: { fontSize: normalize(12), color: colors.primary },
    replyStatusPendingText: { fontSize: normalize(12), color: colors.textSecondary },

    detailScroll: { padding: normalize(12), paddingBottom: normalize(80) },
    letterCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(10),
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    letterAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(12) },
    letterAuthor: { fontSize: normalize(14), fontFamily: fonts.bold, color: colors.textPrimary },
    letterTime: { fontSize: normalize(12), color: colors.textSecondary },
    letterBody: { fontSize: normalize(15), color: colors.textPrimary, lineHeight: normalize(22), marginBottom: normalize(14) },
    letterDivider: { height: 1, backgroundColor: colors.textLight10, marginBottom: normalize(10) },
    letterAnonNote: { flexDirection: 'row', alignItems: 'center', gap: normalize(5) },
    anonNoteText: { fontSize: normalize(12), color: colors.textSecondary },
    anonBadge: { backgroundColor: colors.textLight10, borderRadius: normalize(4), paddingVertical: normalize(2), paddingHorizontal: normalize(7) },
    anonBadgeText: { fontSize: normalize(11), fontFamily: fonts.bold, color: colors.textSecondary },
    anonNoteSub: { fontSize: normalize(11), color: colors.textSecondary, marginLeft: 'auto' },

    repliedCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(10),
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    repliedCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: normalize(10) },
    repliedLabel: { flexDirection: 'row', alignItems: 'center', gap: normalize(5) },
    repliedLabelGreen: { color: colors.primary, fontFamily: fonts.bold, fontSize: normalize(13) },
    repliedAt: { fontSize: normalize(11), color: colors.textSecondary },
    repliedDivider: { height: 1, backgroundColor: colors.textLight10, marginBottom: normalize(10) },
    repliedBody: { fontSize: normalize(14), color: colors.textPrimary, lineHeight: normalize(20) },
    repliedSub: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), marginTop: normalize(10) },
    repliedSubText: { fontSize: normalize(11), color: colors.textSecondary },

    replyCtaCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    replyCtaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: normalize(8) },
    replyCtaTitle: { fontSize: normalize(14), fontFamily: fonts.bold, color: colors.textPrimary },
    onceBadge: { backgroundColor: '#FFF3E0', paddingVertical: normalize(2), paddingHorizontal: normalize(8), borderRadius: normalize(20) },
    onceBadgeText: { fontSize: normalize(10), fontFamily: fonts.bold, color: '#E08020' },
    replyCtaDesc: { fontSize: normalize(12), color: colors.textSecondary, lineHeight: normalize(18), marginBottom: normalize(12) },
    warnBox: {
      backgroundColor: '#FFF8F0',
      borderWidth: 1,
      borderLeftWidth: 3,
      borderColor: '#F0D8B0',
      borderLeftColor: '#E08020',
      borderRadius: normalize(6),
      padding: normalize(12),
      marginBottom: normalize(14),
    },
    warnBoxText: { fontSize: normalize(11), color: '#8a5020', lineHeight: normalize(18) },
    replyBtn: { backgroundColor: colors.primary, borderRadius: normalize(8), paddingVertical: normalize(12), alignItems: 'center' },
    replyBtnText: { fontSize: normalize(14), fontFamily: fonts.bold, color: colors.textWhite },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(16),
      borderTopRightRadius: normalize(16),
      paddingBottom: normalize(24),
      maxHeight: '80%',
    },
    modalDrag: { width: normalize(36), height: normalize(3), backgroundColor: '#E0E0E0', borderRadius: 2, marginTop: normalize(12), alignSelf: 'center' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: normalize(16), borderBottomWidth: 1, borderBottomColor: colors.textLight10 },
    modalTitle: { fontSize: normalize(15), fontFamily: fonts.bold, color: colors.textPrimary },
    modalClose: { fontSize: normalize(20), color: colors.textSecondary },
    modalWarnInline: { marginHorizontal: normalize(16), marginTop: normalize(12), padding: normalize(12), backgroundColor: '#FFF8F0', borderLeftWidth: 3, borderLeftColor: '#E08020', borderRadius: normalize(6) },
    modalWarnText: { fontSize: normalize(11), color: '#8a5020', lineHeight: normalize(18) },
    modalTextarea: {
      marginHorizontal: normalize(16),
      marginTop: normalize(12),
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: colors.textLight10,
      borderRadius: normalize(10),
      padding: normalize(12),
      fontSize: normalize(14),
      color: colors.textPrimary,
      minHeight: normalize(120),
    },
    modalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: normalize(16), paddingTop: normalize(8) },
    charCount: { fontSize: normalize(11), color: colors.textSecondary },
    sendBtn: { backgroundColor: colors.primary, borderRadius: normalize(8), paddingVertical: normalize(9), paddingHorizontal: normalize(20) },
    sendBtnDisabled: { backgroundColor: colors.primaryLight30 },
    sendBtnText: { fontSize: normalize(13), fontFamily: fonts.bold, color: colors.textWhite },

    toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: normalize(24) },
    toastCard: { backgroundColor: colors.background, borderRadius: normalize(16), padding: normalize(28), maxWidth: 300, width: '85%', alignItems: 'center' },
    toastIcon: { fontSize: normalize(36), marginBottom: normalize(12) },
    toastTitle: { fontSize: normalize(16), fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: normalize(8) },
    toastDesc: { fontSize: normalize(12), color: colors.textSecondary, lineHeight: normalize(20), marginBottom: normalize(18), textAlign: 'center' },
    toastOk: { backgroundColor: colors.primary, borderRadius: normalize(8), paddingVertical: normalize(12), width: '100%', alignItems: 'center' },
    toastOkText: { fontSize: normalize(14), fontFamily: fonts.bold, color: colors.textWhite },
  });
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
