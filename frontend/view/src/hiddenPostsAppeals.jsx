import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import {
  createHiddenPostsAppealsStyles,
  getHiddenPostsAppealsStatusColor,
  getNormalize,
} from '../../styles/mypage.style';

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

function getReporterStatusLabel(report) {
  const s = String(report?.status || '').toLowerCase();
  if (s === 'resolved') return '처리 완료';
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
  if (!appeal) return { label: '대기 중', message: '아직 소명 없음' };
  const s = String(appeal.status || '').toLowerCase();
  if (s === 'accepted') return { label: '복구 완료', message: '소명 accepted' };
  if (s === 'rejected') return { label: '제재 확정', message: '소명 rejected' };
  return { label: '검토 중', message: '소명 접수됐고 검토 중' };
}

// ─── 공통 카드 ─────────────────────────────────────────────────────────────

function Card({ statusLabel, styles: hpa, children }) {
  const sc = getHiddenPostsAppealsStatusColor(statusLabel, colors);
  return (
    <View style={hpa.card}>
      <View style={[hpa.cardAccent, { backgroundColor: sc.bar }]} />
      <View style={hpa.cardInner}>{children}</View>
    </View>
  );
}

function StatusChipLeadingIcon({ label, color, normalize }) {
  const size = normalize(10);
  if (label === '처리 완료' || label === '복구 완료') {
    return <Entypo name="check" size={size} color={color} />;
  }
  if (label === '검토 중' || label === '대기 중') {
    return <Feather name="clock" size={size} color={color} />;
  }
  if (label === '반려' || label === '제재 확정') {
    return <Feather name="alert-triangle" size={size} color={color} />;
  }
  return null;
}

function StatusChip({ label, styles: hpa, wrapStyle, normalize }) {
  const sc = getHiddenPostsAppealsStatusColor(label, colors);
  const lead = <StatusChipLeadingIcon label={label} color={sc.text} normalize={normalize} />;
  return (
    <View style={[hpa.statusChip, wrapStyle, { backgroundColor: sc.bg }]}>
      <View style={hpa.statusChipContent}>
        {lead}
        <Text style={[hpa.statusChipText, { color: sc.text }]}>{label}</Text>
      </View>
    </View>
  );
}

function EmptyState({ message, styles: hpa, normalize }) {
  return (
    <View style={hpa.emptyWrap}>
      <View style={hpa.emptyIcon}>
        <MaterialCommunityIcons name="flag-off-outline" size={normalize(48)} color={colors.textLight40} />
      </View>
      <Text style={hpa.emptyText}>{message}</Text>
    </View>
  );
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

export default function HiddenPostsAppeals({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const hpa = useMemo(() => createHiddenPostsAppealsStyles(width, normalize), [width, normalize]);

  const [tab, setTab] = useState('myReports');
  const slideAnim = useRef(new Animated.Value(0)).current;
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

  const reportStats = useMemo(() => {
    let resolved = 0;
    let rejected = 0;
    let pending = 0;
    for (const r of myReports) {
      const s = String(r.status || '').toLowerCase();
      if (s === 'resolved') resolved += 1;
      else if (s === 'rejected') rejected += 1;
      else pending += 1;
    }
    return { resolved, rejected, pending };
  }, [myReports]);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangeAppealInput = (postId, text) =>
    setAppealInputs((prev) => ({ ...prev, [postId]: text }));

  const handleSubmitAppeal = async (postId) => {
    const content = String(appealInputs[postId] ?? '').trim();
    if (!content) {
      Alert.alert('안내', '소명 내용을 입력해 주세요.');
      return;
    }
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

  const renderMyReports = () => {
    if (myReports.length === 0) {
      return <EmptyState message="접수한 신고 내역이 없습니다." styles={hpa} normalize={normalize} />;
    }

    return (
      <>
        <View style={hpa.statSummaryBox}>
          {[
            { num: reportStats.pending, label: '검토 중', highlight: false },
            { num: reportStats.rejected, label: '반려', highlight: false },
            { num: reportStats.resolved, label: '처리 완료', highlight: true },
          ].map(({ num, label, highlight }, index) => (
            <React.Fragment key={label}>
              {index > 0 ? <View style={hpa.statSummaryDivider} /> : null}
              <View style={hpa.statSummaryCell}>
                <Text style={[hpa.statNumber, highlight && hpa.statNumberHighlight]}>{num}</Text>
                <Text style={hpa.statLabel}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {myReports.map((report) => {
          const statusLabel = getReporterStatusLabel(report);
          return (
            <Card key={report.id} statusLabel={statusLabel} styles={hpa}>
              <View style={hpa.rowBetween}>
                <View style={hpa.pillNeutral}>
                  <Text style={hpa.pillNeutralText}>게시글</Text>
                </View>
              </View>

              <Text numberOfLines={2} style={hpa.previewText}>
                {report.target_content || '(원문을 확인할 수 없는 신고 대상입니다)'}
              </Text>

              <View style={hpa.dividerSection}>
                <View style={hpa.reportMetaRow}>
                  <StatusChip
                    label={statusLabel}
                    styles={hpa}
                    wrapStyle={{ alignSelf: 'center' }}
                    normalize={normalize}
                  />
                  <Text
                    style={[hpa.metaText, hpa.reportMetaTextFlex]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getReporterStatusMessage(report.status)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderRestricted = () => {
    if (hiddenPosts.length === 0) {
      return <EmptyState message="숨김 처리된 게시글이 없습니다." styles={hpa} normalize={normalize} />;
    }

    return hiddenPosts.map((post) => {
      const input = appealInputs[post.id] ?? '';
      const isSubmitting = submittingPostId === post.id;
      const { label, message } = getRestrictedStatus(post.id, appealsByPostId);
      const hasAppeal = appealsByPostId.has(post.id);

      return (
        <Card key={post.id} statusLabel={label} styles={hpa}>
          <View style={hpa.rowBetween}>
            <View style={hpa.pillDanger}>
              <Text style={hpa.pillDangerText}>게시글 제한</Text>
            </View>
            <Text style={hpa.metaTime}>{formatTimeAgo(post.hidden_at)}</Text>
          </View>

          <Text numberOfLines={2} style={hpa.previewText}>
            {post.content}
          </Text>

          <View style={hpa.noticeBox}>
            <StatusChip label={label} styles={hpa} normalize={normalize} />
            <Text style={hpa.metaText}>{message}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                '커뮤니티 가이드라인',
                '게시글 작성 전 커뮤니티 가이드라인을 확인해 주세요.\n욕설/혐오/개인정보 노출/광고성 콘텐츠는 제재 대상입니다.',
              )
            }
            style={hpa.guideLink}
          >
            <Text style={hpa.guideLinkText}>커뮤니티 가이드라인 확인하기</Text>
          </TouchableOpacity>

          {!hasAppeal && (
            <>
              <TextInput
                value={input}
                onChangeText={(text) => handleChangeAppealInput(post.id, text)}
                placeholder="소명 내용을 작성해 주세요"
                placeholderTextColor={colors.textLight40}
                multiline
                style={hpa.appealInput}
              />
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => handleSubmitAppeal(post.id)}
                style={[hpa.appealSubmit, isSubmitting && hpa.appealSubmitDisabled]}
              >
                <Text style={hpa.appealSubmitText}>{isSubmitting ? '접수 중...' : '이의신청 접수'}</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>
      );
    });
  };

  const TAB_ITEMS = [
    { key: 'myReports', label: '내가 한 신고' },
    { key: 'restricted', label: '제한된 내역' },
  ];

  const handleTabChange = (key) => {
    setTab(key);
    const toValue = key === 'myReports' ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  return (
    <SafeAreaView style={hpa.safeArea} edges={['top']}>
      <SubHeader title="클린 센터" onBack={() => navigation.goBack()} />

      <View style={hpa.toggleContainer}>
        <View style={hpa.toggleTrack}>
          <Animated.View
            style={[
              hpa.togglePill,
              {
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '50%'],
                }),
              },
            ]}
          />
          {TAB_ITEMS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={hpa.toggleOption}
              onPress={() => handleTabChange(key)}
              activeOpacity={1}
            >
              <Text style={[hpa.toggleOptionText, tab === key && hpa.toggleOptionTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={hpa.scroll}
        contentContainerStyle={hpa.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={hpa.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : tab === 'myReports' ? (
          renderMyReports()
        ) : (
          renderRestricted()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
