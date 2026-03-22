import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';

export default function MailReplyScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const mail = route?.params?.mail;
  const onSent = route?.params?.onSent;
  const [replyText, setReplyText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);

  const handleReplyTextChange = (text) => {
    if (text.length > 50) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setReplyText(text);
  };

  const availableHeight = Math.max(0, height - subHeaderHeight - bottomHeight);
  const halfCardHeight = Math.max(240, Math.floor(availableHeight * 0.4));

  const handleSend = () => {
    if (!replyText.trim()) return;

    // 실제 전송 로직은 이후 연동
    setShowToast(true);
  };

  const handleToastClose = () => {
    setShowToast(false);
    if (typeof onSent === 'function') {
      onSent(replyText.trim());
    }
    navigation.goBack();
  };

  if (!mail) {
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
            <View style={[styles.replyFormCard, { minHeight: halfCardHeight }]}>
              <Text style={styles.replyFormToLabel}>
                To. <Text style={styles.replyFormToName}>익명</Text>
              </Text>

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

            <View style={[styles.modalLetterPreviewCard, { minHeight: halfCardHeight }]}>
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
          </ScrollView>

          <View
            style={styles.modalFullBottom}
            onLayout={(e) => setBottomHeight(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={[styles.bottomCtaButton, !replyText.trim() && styles.bottomCtaDisabled]}
              onPress={handleSend}
              disabled={!replyText.trim()}
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>보내기</Text>
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

