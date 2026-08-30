import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api } from '../../utils/api';

function statusLabel(status) {
  if (status === 'answered') return '답변완료';
  if (status === 'closed') return '종료';
  return '대기중';
}

function formatDateTime(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

/**
 * 문의 단건 (질문 + 관리자 답변)
 * @param {{ navigation: any, route?: any, inquiryId?: number, fullScreenOverlay?: boolean }} props
 */
const InquiryDetail = ({
  navigation,
  route,
  inquiryId: inquiryIdProp,
  fullScreenOverlay = false,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useCallback(
    (size) => Math.round((width / 375) * size),
    [width],
  );
  const inquiryId = Number(
    inquiryIdProp ?? route?.params?.inquiryId ?? route?.params?.relatedId,
  );

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
      setError('유효하지 않은 문의입니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/inquiries/${inquiryId}`);
      const row = res.data?.data?.inquiry || null;
      setInquiry(row);
      if (
        row &&
        (row.status === 'answered' || row.status === 'closed') &&
        !row.is_read_by_user
      ) {
        api.patch(`/api/inquiries/${inquiryId}/read`).catch(() => {});
      }
    } catch (e) {
      setError(
        e?.response?.data?.message || '문의를 불러오지 못했습니다.',
      );
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const styles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: colors.background },
      center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: normalize(24),
      },
      errorText: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textSecondary,
        textAlign: 'center',
      },
      content: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(16),
        gap: normalize(20),
      },
      metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      status: {
        fontFamily: fonts.bold,
        fontSize: normalize(13),
        color: colors.primary,
      },
      date: {
        fontFamily: fonts.regular,
        fontSize: normalize(12),
        color: colors.textSecondary,
      },
      sectionLabel: {
        fontFamily: fonts.bold,
        fontSize: normalize(13),
        color: colors.textSecondary,
        marginBottom: normalize(8),
      },
      bodyText: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textPrimary,
        lineHeight: normalize(22),
      },
      answerBox: {
        backgroundColor: colors.textLight5,
        borderRadius: normalize(12),
        padding: normalize(14),
      },
      pendingHint: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.sm),
        color: colors.textSecondary,
        lineHeight: normalize(20),
      },
    }),
    [normalize],
  );

  const Root = fullScreenOverlay ? View : SafeAreaView;
  const hasAnswer = Boolean(String(inquiry?.answer_content || '').trim());

  return (
    <Root
      style={styles.container}
      {...(fullScreenOverlay ? {} : { edges: ['top'] })}
    >
      <SubHeader title="문의 상세" onBack={() => navigation?.goBack?.()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.metaRow}>
            <Text style={styles.status}>{statusLabel(inquiry?.status)}</Text>
            <Text style={styles.date}>
              {formatDateTime(inquiry?.created_at)}
            </Text>
          </View>

          <View>
            <Text style={styles.sectionLabel}>문의 내용</Text>
            <Text style={styles.bodyText}>{inquiry?.content || ''}</Text>
          </View>

          <View>
            <Text style={styles.sectionLabel}>답변</Text>
            {hasAnswer ? (
              <View style={styles.answerBox}>
                <Text style={styles.bodyText}>{inquiry.answer_content}</Text>
                {inquiry.answered_at ? (
                  <Text style={[styles.date, { marginTop: normalize(10) }]}>
                    {formatDateTime(inquiry.answered_at)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.pendingHint}>
                아직 답변이 등록되지 않았습니다. 답변이 오면 알림으로
                알려 드릴게요.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </Root>
  );
};

export default InquiryDetail;
