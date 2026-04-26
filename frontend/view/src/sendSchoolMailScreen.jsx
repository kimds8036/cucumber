import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors } from '../../styles/colors';
import Loading from '../../components/Loading';
import { api } from '../../utils/api';

const SendSchoolMailScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  /** 학교 우편함 등에서 navigate 시 전달 (별도 조회 API 없음) */
  const schoolId = route?.params?.schoolId ?? null;
  const schoolName = route?.params?.schoolName ?? '';

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
    if (!schoolId) {
      Alert.alert('오류', '학교 정보가 없습니다.');
      return;
    }
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
        <View style={styles.keyboardView}>
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.sendScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bottomOffset={Math.max(bottomCtaHeight, 16)}
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
                  value={schoolName || '(학교 정보 없음)'}
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
          </KeyboardAwareScrollView>

          <View
            style={styles.bottomCtaWrapper}
            onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={[
                styles.bottomCtaButton,
                (!mailContent.trim() || !schoolId || sending) && styles.bottomCtaDisabled,
              ]}
              onPress={handleSend}
              disabled={!mailContent.trim() || !schoolId || sending}
              activeOpacity={0.9}
            >
              {sending ? (
                <Loading color={colors.background} />
              ) : (
                <Text style={styles.bottomCtaText}>전송하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SendSchoolMailScreen;
