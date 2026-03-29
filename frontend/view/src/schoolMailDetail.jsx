import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailDetailStyles } from '../../styles/SchoolMail.style';
import { api } from '../../utils/api';
import { getSchoolMailFromLabel } from './utils/schoolMailFromLabel';

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(createdAt);
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

export default function SchoolMailDetail({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolMailDetailStyles(width, normalize), [width, normalize]);

  const schoolName = route?.params?.schoolName;
  const routeSchoolId = route?.params?.schoolId;
  const mailId = route?.params?.mailId;

  const [mail, setMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [postLiked, setPostLiked] = useState(false);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const postMenuButtonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (mailId == null) {
      setLoading(false);
      setError('우편을 찾을 수 없습니다.');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/mails/school/${mailId}`);
        const data = res.data?.data;
        if (cancelled) return;
        setMail(data ?? null);
        if (!data) setError('우편을 찾을 수 없습니다.');
      } catch (e) {
        if (!cancelled) {
          console.error('학교 우편 상세 로드 실패:', e?.response?.data || e.message);
          setMail(null);
          setError(e?.response?.data?.message ?? '우편을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mailId]);

  const mailBody = mail?.content ?? '';
  const fromLine = getSchoolMailFromLabel(mail, routeSchoolId ?? mail?.school_id);
  const timeLabel = formatTimeAgo(mail?.created_at) || String(mail?.created_at ?? '');
  const commentCount = mail?.comment_count ?? 0;

  const openFloatingMenu = (ref) => {
    ref?.measureInWindow?.((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuVisible(true);
    });
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
  };

  const handlePostLike = () => setPostLiked((p) => !p);
  const showLikes = (mail?.likes ?? 0) + (postLiked ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="받은 우편" onBack={() => navigation.goBack()} />
        </View>

        <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }} pointerEvents="box-none">
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: normalize(24) }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.smDetailScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.smDetailLetterWrap}>
                <View style={styles.smDetailLetterCard}>
                  <View style={styles.smDetailLetterTopRow}>
                    <View style={styles.smDetailFromToCol}>
                      <Text style={styles.smDetailFromToText}>From. {fromLine}</Text>
                      {!!schoolName && (
                        <Text
                          style={[styles.smDetailFromToText, { marginTop: normalize(4), opacity: 0.85 }]}
                          numberOfLines={1}
                        >
                          {schoolName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.smDetailDashedRule} />
                  <Text style={styles.smDetailMailBody}>{mailBody}</Text>
                  <View style={styles.smDetailMailFooter}>
                    <Text style={styles.smDetailMailTime}>{timeLabel}</Text>
                    <View style={styles.smDetailMailStats}>
                      <TouchableOpacity
                        style={styles.smDetailStatItem}
                        onPress={handlePostLike}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <FontAwesome
                          name={postLiked ? 'heart' : 'heart-o'}
                          size={normalize(14)}
                          color={colors.alert}
                        />
                        <Text style={styles.smDetailStatText}>{showLikes}</Text>
                      </TouchableOpacity>
                      <View style={styles.smDetailStatItem}>
                        <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                        <Text style={styles.smDetailStatText}>{commentCount}</Text>
                      </View>
                      <View ref={postMenuButtonRef} collapsable={false}>
                        <TouchableOpacity
                          style={styles.smDetailMenuBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => openFloatingMenu(postMenuButtonRef.current)}
                        >
                          <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* 댓글 기능 준비 중 — school_mail_comments 미구성으로 목록/입력 UI 비표시 */}
            </ScrollView>
          )}
        </View>

        <Modal
          visible={floatingMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeFloatingMenu}
        >
          <TouchableWithoutFeedback onPress={closeFloatingMenu}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.3)',
                ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
              }}
            >
              <TouchableWithoutFeedback>
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: normalize(12),
                    minWidth: width * 0.45,
                    maxWidth: width * 0.7,
                    paddingVertical: normalize(4),
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 5,
                    elevation: 5,
                    ...(floatingMenuAnchor
                      ? {
                          position: 'absolute',
                          right: width - floatingMenuAnchor.x,
                          top: floatingMenuAnchor.y,
                        }
                      : {}),
                  }}
                >
                  {['신고하기', '차단하기', '공유하기'].map((label, index) => (
                    <React.Fragment key={label}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: normalize(10),
                          paddingHorizontal: normalize(14),
                        }}
                        activeOpacity={0.7}
                        onPress={closeFloatingMenu}
                      >
                        <Text
                          style={{
                            fontSize: normalize(13),
                            fontFamily: fonts.regular,
                            color: colors.textPrimary,
                          }}
                        >
                          {label}
                        </Text>
                        <Ionicons
                          name={
                            index === 0 ? 'flag-outline' : index === 1 ? 'remove-circle-outline' : 'share-outline'
                          }
                          size={normalize(17)}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      {index < 2 && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: colors.textLight10,
                            marginHorizontal: normalize(8),
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
