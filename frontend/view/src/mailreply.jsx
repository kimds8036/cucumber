import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';

export default function MailReplyScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const mail = route?.params?.mail;
  const mailId = route?.params?.mailId ?? route?.params?.mail?.id;
  const onSent = route?.params?.onSent;
  const [replyText, setReplyText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);

  const handleReplyTextChange = (text) => {
    if (text.length > 50) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setReplyText(text);
  };

  const availableHeight = Math.max(
    0,
    height - insets.top - insets.bottom - subHeaderHeight - bottomHeight,
  );
  const scrollPadding = 16 + 32; // paddingTop + paddingBottom (normalize 적용 전 raw값 기준)
  const cardGap = 12;
  const halfCardHeight = Math.max(
    240,
    Math.floor((availableHeight - scrollPadding - cardGap) / 2),
  );
  console.log('height', height);
  console.log('insets', insets.top, insets.bottom);
  console.log('subHeaderHeight', subHeaderHeight);
  console.log('bottomHeight', bottomHeight);
  console.log('availableHeight', availableHeight);
  console.log('halfCardHeight', halfCardHeight);

  const handleSend = async () => {
    if (!replyText.trim()) return;
    if (!mailId) {
      Alert.alert('오류', '원본 우편 정보가 없습니다.');
      return;
    }
    try {
      setSending(true);
      await api.post(`/api/mails/personal/${mailId}/reply`, {
        content: replyText.trim(),
      });
      setShowToast(true);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '답장 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleToastClose = () => {
    setShowToast(false);
    if (typeof onSent === 'function') {
      onSent(replyText.trim());
    }
    navigation.goBack();
  };

  if (!mailId) {
    return null;
  }

  return (
    <>
      <SafeAreaView style={styles.modalFullSafe} edges={['top', 'bottom']}>
        <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
          <SubHeader
            title="우편 보내기"
            onBack={() => navigation.goBack()}
          />
        </View>

        <View style={styles.modalFullRoot}>
          <ScrollView
            style={styles.modalFullScroll}
            contentContainerStyle={styles.modalFullContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.modalLetterPreviewCard,
                { minHeight: halfCardHeight, marginBottom: 12 },
              ]}
            >
              {/* 상세 화면과 동일한 헤더 디자인 */}
              <View style={styles.detailSenderRow}>
                <View
                  style={[
                    styles.detailAvatar,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <View style={styles.detailSenderTexts}>
                  <Text style={styles.detailSenderName}>익명</Text>
                  <Text style={styles.detailTime}>
                    {mail?.receivedAt ?? ''}
                  </Text>
                </View>
                <View style={styles.detailReplyBadge}>
                  <Text style={styles.detailReplyBadgeText}>받은 우편</Text>
                </View>
              </View>

              <View style={styles.detailDivider} />
              {previewExpanded ? (
                <Text style={styles.detailBody}>{mail?.content ?? ''}</Text>
              ) : (
                <Text style={styles.detailBody} numberOfLines={1} ellipsizeMode="tail">
                  {mail?.content ?? ''}
                </Text>
              )}
            </View>

            <View style={[styles.replyFormCard, { minHeight: halfCardHeight }]}>
              <TextInput
                style={styles.replyFormInput}
                placeholder="내용을 입력하세요"
                placeholderTextColor={colors.textSecondary}
                value={replyText}
                onChangeText={handleReplyTextChange}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.replyFormMetaRow}>
                <View style={{ marginLeft: 'auto', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <Text style={styles.replyFormCount}>{replyText.length}/50자</Text>
                  <View style={styles.replyFormChip}>
                    <MaterialCommunityIcons name="television-classic" size={15} color={colors.textPrimary} />
                    <Text style={styles.replyFormChipText}>x 2</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={styles.modalFullBottom}
            onLayout={(e) => setBottomHeight(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={[styles.bottomCtaButton, !replyText.trim() && styles.bottomCtaDisabled]}
              onPress={handleSend}
              disabled={!replyText.trim() || sending}
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>{sending ? '전송 중...' : '보내기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* 전송 완료 토스트 */}
      <Modal visible={showToast} transparent animationType="fade">
        <View style={styles.toastOverlay}>
          <View style={styles.toastCard}>
            <Text style={styles.toastIcon}>📮</Text>
            <Text style={styles.toastTitle}>답장을 보냈어요</Text>
            <Text style={styles.toastDesc}>
              익명의 상대에게 우편이 전달됐습니다.
            </Text>
            <TouchableOpacity style={styles.toastOk} onPress={handleToastClose} activeOpacity={0.8}>
              <Text style={styles.toastOkText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

