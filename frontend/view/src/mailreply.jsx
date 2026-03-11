import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';

export default function MailReplyScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const mail = route?.params?.mail;
  const [replyText, setReplyText] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSend = () => {
    if (!replyText.trim()) return;

    // 실제 전송 로직은 이후 연동
    setShowToast(true);
  };

  const handleToastClose = () => {
    setShowToast(false);
    navigation.goBack();
  };

  if (!mail) {
    return null;
  }

  return (
    <>
      <SafeAreaView style={styles.modalFullSafe} edges={['top', 'bottom']}>
        <SubHeader title="우편 보내기" onBack={() => navigation.goBack()} />

        <View style={styles.modalFullRoot}>
          <ScrollView
            style={styles.modalFullScroll}
            contentContainerStyle={styles.modalFullContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.replyFormCard}>
              <Text style={styles.replyFormToLabel}>
                To. <Text style={styles.replyFormToName}>익명</Text>
              </Text>

              <TextInput
                style={styles.replyFormInput}
                placeholder="고마워"
                placeholderTextColor={colors.textSecondary}
                value={replyText}
                onChangeText={setReplyText}
                maxLength={50}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.replyFormMetaRow}>
                <Text style={styles.replyFormCount}>{replyText.length}/50자</Text>
                <View style={styles.replyFormChip}>
                  <Text style={styles.replyFormChipIcon}>⏱</Text>
                  <Text style={styles.replyFormChipText}>x 2</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalLetterPreviewCard}>
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

            <Text style={styles.modalFullNotice}>답장은 1번만 가능해요</Text>
          </ScrollView>

          <View style={styles.modalFullBottom}>
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
              익명의 상대에게 전달됐습니다.{'\n'}상대방은 이제 내가 누군지 알 수 있어요.{'\n\n'}이 편지에 더 이상 답장할 수 없어요.
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

