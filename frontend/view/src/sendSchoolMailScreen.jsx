import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { getNormalize } from '../../styles/frame.style';
import { createSendSchoolMailStyles } from '../../styles/SchoolMail.style';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';

const SendSchoolMailScreen = () => {
  const route = useRoute();
  const { goBack } = useAppNavigation();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSendSchoolMailStyles(normalize), [normalize]);

  const schoolName = route.params?.schoolName ?? 'OO고등학교';
  const schoolId = route.params?.schoolId ?? null;

  const [mailContent, setMailContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleMailContentChange = (text) => {
    if (text.length > 50) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setMailContent(text);
  };

  const doSend = async () => {
    if (!schoolId) {
      Alert.alert('오류', '학교 정보가 없습니다.');
      return;
    }
    const content = mailContent.trim();
    if (!content) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/mails/school', { schoolId, content });
      Alert.alert('완료', '우편이 전송되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            setMailContent('');
            goBack();
          },
        },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message ?? '전송 실패';
      Alert.alert('오류', msg);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!mailContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (!schoolId) {
      Alert.alert('오류', '학교 정보가 없습니다.');
      return;
    }

    Alert.alert('우편 전송', `「${schoolName}」학교 우편함으로 전송하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '전송', onPress: () => doSend() },
    ]);
  };

  const canSend = !!mailContent.trim() && !!schoolId && !sending;

  return (
    <View style={styles.schoolSendOuter}>
      <SafeAreaView style={styles.schoolSendSafe} edges={['top', 'bottom']}>
        <SubHeader title="우편 보내기" onBack={() => goBack()} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.schoolSendKeyboard}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.schoolSendScroll}
              contentContainerStyle={styles.schoolSendScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.schoolSendSection, { marginTop: 0 }]}>
                <Text style={styles.schoolSendFieldLabel}>보낼 학교</Text>
                <View style={styles.schoolSendFixedSchoolBox}>
                  <Ionicons name="school-outline" size={normalize(20)} color={colors.textSecondary} />
                  <View style={styles.schoolSendFixedSchoolTexts}>
                    <Text style={styles.schoolSendFixedSchoolName}>{schoolName}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.schoolSendSection, { flex: 1, marginBottom: normalize(8) }]}>
                <Text style={styles.schoolSendFieldLabel}>내용</Text>
                <View style={styles.schoolSendBodyWrap}>
                  <TextInput
                    style={styles.schoolSendBodyInput}
                    placeholder="학교 우편함에 보낼 내용을 입력하세요"
                    value={mailContent}
                    onChangeText={handleMailContentChange}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor={colors.textSecondary}
                    editable={!sending}
                  />
                  <View style={styles.schoolSendMetaRow}>
                    <View style={{ marginLeft: 'auto', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                      <Text style={styles.schoolSendCharCount}>{mailContent.length}/50자</Text>
                      <View style={styles.schoolSendAdChip}>
                        <MaterialCommunityIcons name="television-classic" size={15} color={colors.textPrimary} />
                        <Text style={styles.schoolSendAdChipText}>x 2</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.schoolSendCtaBar}>
              <TouchableOpacity
                style={[styles.schoolSendCtaBtn, !canSend && styles.schoolSendCtaBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.9}
              >
                {sending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.schoolSendCtaLabel}>전송하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
};

export default SendSchoolMailScreen;
