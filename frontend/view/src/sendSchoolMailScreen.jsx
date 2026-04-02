import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors } from '../../styles/colors';
import Loading from '../../components/Loading';
import { api } from '../../utils/api';

/** ourschoolscreen 연동 전 임시 값 (추후 route.params 또는 API로 대체) */
const TEMP_SCHOOL_ID = 1;
const TEMP_SCHOOL_NAME = '진관고등학교';

const SendSchoolMailScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const schoolId = route?.params?.schoolId ?? TEMP_SCHOOL_ID;
  const schoolName = route?.params?.schoolName ?? TEMP_SCHOOL_NAME;

  const [mailContent, setMailContent] = useState('');
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);

  const handleMailContentChange = (text) => {
    if (text.length > 50) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setMailContent(text);
  };

  const handleSend = async () => {
    if (!mailContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    try {
      setSending(true);
      await api.post('/api/mails/school', {
        schoolId,
        content: mailContent.trim(),
      });
      console.log('[SendSchoolMail] 전송 성공:', { schoolId, length: mailContent.trim().length });
      Alert.alert('완료', '우편이 전송되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation?.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '우편 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const scrollPadding = 16 * 2;
  const sectionGap = 12 * 2;
  const contentSectionMinHeight = Math.max(
    200,
    height -
      insets.top -
      insets.bottom -
      subHeaderHeight -
      schoolSectionHeight -
      bottomCtaHeight -
      scrollPadding -
      sectionGap,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
        <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />
      </View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.sendScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={styles.section}
              onLayout={(e) => setSchoolSectionHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.label}>보낼 학교</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={normalize(18)}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { marginLeft: normalize(6) }]}
                  value={schoolName}
                  editable={false}
                  pointerEvents="none"
                />
              </View>
            </View>

            <View
              style={[styles.section, { flex: 1, minHeight: contentSectionMinHeight }]}
            >
              <Text style={styles.label}>내용</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="보낼 내용을 입력하세요"
                  value={mailContent}
                  onChangeText={handleMailContentChange}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.replyFormMetaRow}>
                  <View style={styles.sendMetaRight}>
                    <Text style={styles.replyFormCount}>{mailContent.length}/50자</Text>
                    <View style={styles.replyFormChip}>
                      <MaterialCommunityIcons name="television-classic" size={15} color={colors.textPrimary} />
                      <Text style={styles.replyFormChipText}>x 2</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={styles.bottomCtaWrapper}
            onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={[
                styles.bottomCtaButton,
                (!mailContent.trim() || sending) && styles.bottomCtaDisabled,
              ]}
              onPress={handleSend}
              disabled={!mailContent.trim() || sending}
              activeOpacity={0.9}
            >
              {sending ? (
                <Loading color={colors.background} />
              ) : (
                <Text style={styles.bottomCtaText}>전송하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SendSchoolMailScreen;
