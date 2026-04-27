import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, useWindowDimensions, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';
import Skeleton from '../../components/common/Skeleton';
import ProfileIcon from '../../assets/Profile.svg';
import { getProfileInnerColor } from '../../utils/profileIconColor';

export default function MailReplyScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const mail = route?.params?.mail;
  const mailId = route?.params?.mailId ?? route?.params?.mail?.id;
  const senderLabel =
    route?.params?.mail?.senderLabel != null &&
    String(route.params.mail.senderLabel).trim()
      ? String(route.params.mail.senderLabel).trim()
      : '익명';
  const profileColorId =
    route?.params?.mail?.profileColorId ??
    route?.params?.mail?.senderColorId ??
    route?.params?.mail?.recipientColorId ??
    null;
  const profileIconColor = getProfileInnerColor(profileColorId);
  const onSent = route?.params?.onSent;
  const [replyText, setReplyText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

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

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.modalFullSafe} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: normalize(16), paddingTop: normalize(16) }}>
          <Skeleton width={normalize(110)} height={normalize(20)} borderRadius={normalize(8)} style={{ marginBottom: normalize(12) }} />
          <Skeleton width="100%" height={normalize(190)} borderRadius={normalize(14)} style={{ marginBottom: normalize(12) }} />
          <Skeleton width="100%" height={normalize(220)} borderRadius={normalize(14)} style={{ marginBottom: normalize(14) }} />
          <Skeleton width="100%" height={normalize(50)} borderRadius={normalize(14)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.modalFullSafe} edges={['top', 'bottom']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
              <SubHeader
                title="우편 보내기"
                onBack={() => navigation.goBack()}
              />
            </View>

            <View style={styles.modalFullRoot}>
              <KeyboardAwareScrollView
                style={styles.modalFullScroll}
                contentContainerStyle={styles.modalFullContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bottomOffset={Math.max(bottomHeight, 16)}
              >
            <View
              style={[
                styles.modalLetterPreviewCard,
                { minHeight: halfCardHeight, marginBottom: 12 },
              ]}
            >
              {/* 상세 화면과 동일한 헤더 디자인 */}
              <View style={styles.detailSenderRow}>
                <View style={[styles.detailAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ProfileIcon
                    width={normalize(28)}
                    height={normalize(28)}
                    color={profileIconColor}
                  />
                </View>
                <View style={styles.detailSenderTexts}>
                  <Text style={styles.detailSenderName}>{senderLabel}</Text>
                  <Text style={styles.detailTime}>
                    {mail?.receivedAt ?? ''}
                  </Text>
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
              </KeyboardAwareScrollView>

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
          </View>
        </TouchableWithoutFeedback>
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

