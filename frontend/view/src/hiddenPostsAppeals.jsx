import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

// ─── 상태 레이블 / 메시지 ───────────────────────────────────────────────────

function getReporterStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved') return '조치 완료';
  if (s === 'rejected') return '반려';
  return '검토 중';
}

function getReporterStatusMessage(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved') return '운영 정책 위반이 확인되어 해당 게시물이 삭제/숨김 처리되었습니다.';
  if (s === 'rejected') return '검토 결과 정책 위반 사항이 확인되지 않았습니다. (반복적인 허위 신고는 제재 대상입니다.)';
  return '신고하신 내용을 운영팀에서 확인하고 있습니다.';
}

function getRestrictedStatus(postId, appealsByPostId) {
  const appeal = appealsByPostId.get(postId);
  if (!appeal) return { label: '검토 대기', message: '신고 누적 내역을 운영팀이 확인하고 있습니다.' };
  const s = String(appeal.status || '').toLowerCase();
  if (s === 'accepted') return { label: '복구 완료', message: '소명 내용이 인정되어 게시글이 복구되었습니다.' };
  if (s === 'rejected') return { label: '제재 확정', message: '검토 결과 위반이 확인되어 조치가 유지됩니다.' };
  return { label: '소명 검토 중', message: '접수된 소명 내용을 운영팀이 검토하고 있습니다.' };
}

// ─── 상태별 컬러 매핑 ──────────────────────────────────────────────────────

const STATUS_COLOR = {
  '조치 완료': { bar: colors.primary,       bg: '#edf7e9', text: '#3a7c2e' },
  '복구 완료': { bar: colors.primary,       bg: '#edf7e9', text: '#3a7c2e' },
  '검토 중':   { bar: '#f59e0b',            bg: '#fef3e2', text: '#b45309' },
  '소명 검토 중': { bar: '#f59e0b',         bg: '#fef3e2', text: '#b45309' },
  '검토 대기': { bar: '#f59e0b',            bg: '#fef3e2', text: '#b45309' },
  '반려':      { bar: '#f87171',            bg: '#fde8e8', text: '#b91c1c' },
  '제재 확정': { bar: '#f87171',            bg: '#fde8e8', text: '#b91c1c' },
};

function getStatusColor(label) {
  return STATUS_COLOR[label] ?? { bar: colors.textLight20, bg: colors.textLight5, text: colors.textSecondary };
}

// ─── 공통 카드 ─────────────────────────────────────────────────────────────

function Card({ statusLabel, normalize, children }) {
  const sc = getStatusColor(statusLabel);
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: normalize(14),
        borderWidth: 1,
        borderColor: colors.textLight10,
        marginBottom: normalize(12),
        overflow: 'hidden',
      }}
    >
      {/* 왼쪽 컬러 바 */}
      <View style={{ width: normalize(4), backgroundColor: sc.bar }} />

      <View style={{ flex: 1, padding: normalize(14) }}>
        {children}
      </View>
    </View>
  );
}

function StatusChip({ label, normalize }) {
  const sc = getStatusColor(label);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: sc.bg,
        borderRadius: normalize(20),
        paddingHorizontal: normalize(9),
        paddingVertical: normalize(3),
      }}
    >
      <Text style={{ fontFamily: fonts.regular, fontSize: normalize(11), color: sc.text }}>
        {label}
      </Text>
    </View>
  );
}

// ─── 빈 상태 ───────────────────────────────────────────────────────────────

function EmptyState({ message, normalize }) {
  return (
    <View style={{ paddingTop: normalize(48), alignItems: 'center', gap: normalize(10) }}>
      <View
        style={{
          width: normalize(48),
          height: normalize(48),
          borderRadius: normalize(24),
          backgroundColor: colors.textLight5,
          borderWidth: 1,
          borderColor: colors.textLight10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <Text style={{ fontFamily: fonts.regular, fontSize: normalize(13), color: colors.textSecondary }}>
        {message}
      </Text>
    </View>
  );
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

export default function HiddenPostsAppeals({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const [tab, setTab] = useState('myReports');
  const [loading, setLoading] = useState(false);
  const [submittingPostId, setSubmittingPostId] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [appealInputs, setAppealInputs] = useState({});

  const appealsByPostId = useMemo(() => {
    const map = new Map();
    for (const item of appeals) {
      const prev = map.get(item.post_id);
      if (!prev || new Date(prev.created_at) < new Date(item.created_at)) {
        map.set(item.post_id, item);
      }
    }
    return map;
  }, [appeals]);

  // 요약 통계
  const reportStats = useMemo(() => ({
    total: myReports.length,
    pending: myReports.filter((r) => String(r.status || '').toLowerCase() === 'pending').length,
    resolved: myReports.filter((r) => String(r.status || '').toLowerCase() === 'resolved').length,
  }), [myReports]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportsRes, hiddenRes, appealsRes] = await Promise.all([
        api.get('/api/posts/reports/my', { params: { page: 1, limit: 50 } }),
        api.get('/api/posts/my/hidden', { params: { page: 1, limit: 50 } }),
        api.get('/api/posts/appeals/my', { params: { page: 1, limit: 50 } }),
      ]);
      setMyReports(reportsRes.data?.data?.reports || []);
      setHiddenPosts(hiddenRes.data?.data?.posts || []);
      setAppeals(appealsRes.data?.data?.appeals || []);
    } catch {
      Alert.alert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChangeAppealInput = (postId, text) =>
    setAppealInputs((prev) => ({ ...prev, [postId]: text }));

  const handleSubmitAppeal = async (postId) => {
    const content = String(appealInputs[postId] ?? '').trim();
    if (!content) { Alert.alert('안내', '소명 내용을 입력해 주세요.'); return; }
    try {
      setSubmittingPostId(postId);
      await api.post(`/api/posts/${postId}/appeal`, { content });
      setAppealInputs((prev) => ({ ...prev, [postId]: '' }));
      Alert.alert('접수 완료', '이의신청이 접수되었습니다.');
      await loadData();
    } catch (error) {
      Alert.alert('오류', error?.response?.data?.message || '이의신청 접수 중 오류가 발생했습니다.');
    } finally {
      setSubmittingPostId(null);
    }
  };

  // ─── 탭: 내가 한 신고 ────────────────────────────────────────────────────

  const renderMyReports = () => {
    if (myReports.length === 0) return <EmptyState message="접수한 신고 내역이 없습니다." normalize={normalize} />;

    return (
      <>
        {/* 요약 통계 */}
        <View
          style={{
            flexDirection: 'row',
            gap: normalize(8),
            marginBottom: normalize(14),
          }}
        >
          {[
            { num: reportStats.total,    label: '전체 신고' },
            { num: reportStats.pending,  label: '검토 중' },
            { num: reportStats.resolved, label: '처리 완료' },
          ].map(({ num, label }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: colors.textLight5,
                borderRadius: normalize(10),
                borderWidth: 1,
                borderColor: colors.textLight10,
                paddingVertical: normalize(12),
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: normalize(20),
                  color: label === '처리 완료' ? colors.primary : colors.textPrimary,
                }}
              >
                {num}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: normalize(11),
                  color: colors.textSecondary,
                  marginTop: normalize(3),
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {myReports.map((report) => {
          const statusLabel = getReporterStatusLabel(report.status);
          return (
            <Card key={report.id} statusLabel={statusLabel} normalize={normalize}>
              {/* 행 1: 타입 pill + 상태 chip */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: normalize(6),
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.textLight10,
                    borderRadius: normalize(20),
                    paddingHorizontal: normalize(9),
                    paddingVertical: normalize(3),
                  }}
                >
                  <Text style={{ fontFamily: fonts.regular, fontSize: normalize(11), color: colors.textSecondary }}>
                    게시글
                  </Text>
                </View>
                <StatusChip label={statusLabel} normalize={normalize} />
              </View>

              {/* 원문 미리보기 */}
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fonts.regular,
                  fontSize: normalize(14),
                  color: colors.textPrimary,
                  lineHeight: normalize(21),
                  marginBottom: normalize(8),
                }}
              >
                {report.target_content || '(원문을 확인할 수 없는 신고 대상입니다)'}
              </Text>

              {/* 구분선 + 메타 */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.textLight10,
                  paddingTop: normalize(8),
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: normalize(12),
                    color: colors.textSecondary,
                    lineHeight: normalize(18),
                  }}
                >
                  {getReporterStatusMessage(report.status)}
                </Text>
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  // ─── 탭: 제한된 내역 (이의신청) ──────────────────────────────────────────

  const renderRestricted = () => {
    if (hiddenPosts.length === 0) return <EmptyState message="숨김 처리된 게시글이 없습니다." normalize={normalize} />;

    return hiddenPosts.map((post) => {
      const input = appealInputs[post.id] ?? '';
      const isSubmitting = submittingPostId === post.id;
      const { label, message } = getRestrictedStatus(post.id, appealsByPostId);
      const hasAppeal = appealsByPostId.has(post.id);

      return (
        <Card key={post.id} statusLabel={label} normalize={normalize}>
          {/* 행 1: 제한 유형 pill + 상태 chip */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: normalize(6),
            }}
          >
            <View
              style={{
                backgroundColor: '#fde8e8',
                borderRadius: normalize(20),
                paddingHorizontal: normalize(9),
                paddingVertical: normalize(3),
              }}
            >
              <Text style={{ fontFamily: fonts.regular, fontSize: normalize(11), color: '#b91c1c' }}>
                게시글 제한
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: normalize(11), color: colors.textSecondary }}>
              {formatTimeAgo(post.hidden_at)}
            </Text>
          </View>

          {/* 게시글 내용 미리보기 */}
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fonts.regular,
              fontSize: normalize(14),
              color: colors.textPrimary,
              lineHeight: normalize(21),
              marginBottom: normalize(8),
            }}
          >
            {post.content}
          </Text>

          {/* 상태 안내 박스 */}
          <View
            style={{
              backgroundColor: colors.textLight5,
              borderRadius: normalize(10),
              borderWidth: 1,
              borderColor: colors.textLight10,
              padding: normalize(12),
              marginBottom: normalize(10),
              gap: normalize(6),
            }}
          >
            <StatusChip label={label} normalize={normalize} />
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(12),
                color: colors.textSecondary,
                lineHeight: normalize(18),
              }}
            >
              {message}
            </Text>
          </View>

          {/* 가이드라인 링크 */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                '커뮤니티 가이드라인',
                '게시글 작성 전 커뮤니티 가이드라인을 확인해 주세요.\n욕설/혐오/개인정보 노출/광고성 콘텐츠는 제재 대상입니다.'
              )
            }
            style={{ marginBottom: normalize(10) }}
          >
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(12),
                color: colors.primaryDark,
                textDecorationLine: 'underline',
              }}
            >
              커뮤니티 가이드라인 확인하기
            </Text>
          </TouchableOpacity>

          {/* 이의신청 입력 — 아직 신청 안 한 경우만 */}
          {!hasAppeal && (
            <>
              <TextInput
                value={input}
                onChangeText={(text) => handleChangeAppealInput(post.id, text)}
                placeholder="소명 내용을 작성해 주세요"
                placeholderTextColor={colors.textLight40}
                multiline
                style={{
                  minHeight: normalize(82),
                  borderWidth: 1,
                  borderColor: colors.textLight10,
                  borderRadius: normalize(10),
                  backgroundColor: colors.textLight5,
                  paddingHorizontal: normalize(10),
                  paddingVertical: normalize(10),
                  fontFamily: fonts.regular,
                  fontSize: normalize(13),
                  color: colors.textPrimary,
                  textAlignVertical: 'top',
                }}
              />
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => handleSubmitAppeal(post.id)}
                style={{
                  marginTop: normalize(10),
                  alignSelf: 'flex-end',
                  backgroundColor: isSubmitting ? colors.textLight20 : colors.primary,
                  borderRadius: normalize(10),
                  paddingHorizontal: normalize(14),
                  paddingVertical: normalize(8),
                }}
              >
                <Text style={{ fontFamily: fonts.regular, fontSize: normalize(12), color: colors.textWhite }}>
                  {isSubmitting ? '접수 중...' : '이의신청 접수'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Card>
      );
    });
  };

  // ─── 탭 버튼 ─────────────────────────────────────────────────────────────

  const TAB_ITEMS = [
    { key: 'myReports',  label: '내가 한 신고' },
    { key: 'restricted', label: '제한된 내역' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <SubHeader title="클린 센터" onBack={() => navigation.goBack()} />

      {/* 세그먼트 탭 */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: normalize(16),
          marginTop: normalize(14),
          marginBottom: normalize(4),
          backgroundColor: colors.textLight5,
          borderRadius: normalize(10),
          borderWidth: 1,
          borderColor: colors.textLight10,
          padding: normalize(3),
          gap: normalize(3),
        }}
      >
        {TAB_ITEMS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={{
              flex: 1,
              paddingVertical: normalize(9),
              borderRadius: normalize(8),
              alignItems: 'center',
              backgroundColor: tab === key ? colors.background : 'transparent',
              borderWidth: tab === key ? 1 : 0,
              borderColor: colors.textLight10,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(13),
                color: tab === key ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: normalize(16),
          paddingTop: normalize(14),
          paddingBottom: normalize(28),
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ paddingTop: normalize(36), alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : tab === 'myReports' ? renderMyReports() : renderRestricted()}
      </ScrollView>
    </SafeAreaView>
  );
}