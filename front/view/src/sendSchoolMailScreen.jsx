import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { StackActions } from '@react-navigation/native';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';
import { useRequireStudentVerified } from '../../hooks/useRequireStudentVerified';
import { usePersonalMailCharLimit } from '../../hooks/usePersonalMailCharLimit';

const SendSchoolMailScreen = ({ navigation, route }) => {
  const { allowed, Gate } = useRequireStudentVerified(navigation, {
    message: '학교 우편은 학생인증 후 이용할 수 있어요.',
    reason: 'school_mail',
  });
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize, width), [normalize, width]);

  const schoolId = route?.params?.schoolId ?? null;
  const schoolName = route?.params?.schoolName ?? '';
  const sourceScreen = route?.params?.sourceScreen ?? null;

  const [mailContent, setMailContent] = useState('');
  const { charLimit, adRewardAvailable, guardTextLength, handleAdReward } =
    usePersonalMailCharLimit();
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);

  const scrollBottomInset = Math.max(normalize(16), insets.bottom);

  const handleMailContentChange = (text) => {
    if (!guardTextLength(text)) return;
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
      Alert.alert('완료', '우편이 전송되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.dispatch(StackActions.pop(1));
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message || '우편 전송 중 오류가 발생했습니다.',
      );
    } finally {
      setSending(false);
    }
  };

  const scrollPadding = 16 * 2;
  const sectionGap = 12;
  const contentSectionMinHeight = Math.max(
    normalize(200),
    height -
      insets.top -
      insets.bottom -
      subHeaderHeight -
      schoolSectionHeight -
      scrollBottomInset -
      scrollPadding -
      sectionGap,
  );

  const sendDisabled = !mailContent.trim() || !schoolId || sending;

  if (!allowed) return <Gate />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
        <SubHeader
          title="우편 보내기"
          onBack={() => navigation?.goBack()}
          onRightPress={handleSend}
          rightDisabled={sendDisabled}
          rightElement={
            <View
              style={[styles.sendPill, sendDisabled && styles.sendPillDisabled]}
            >
              <Text
                style={[
                  styles.sendPillText,
                  sendDisabled && styles.sendPillTextDisabled,
                ]}
              >
                {sending ? '•••' : '전송'}
              </Text>
            </View>
          }
        />
      </View>

      <View style={styles.keyboardView}>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.sendScrollContent,
            { paddingBottom: scrollBottomInset },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          bottomOffset={scrollBottomInset}
        >
          <View collapsable={false}>
            <View
              style={styles.section}
              onLayout={(e) =>
                setSchoolSectionHeight(e.nativeEvent.layout.height)
              }
            >
              <Text style={styles.label}>보낼 학교</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={normalize(18)}
                  color={colors.textLight4}
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
              style={[
                styles.section,
                { flex: 1, minHeight: contentSectionMinHeight },
              ]}
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
                  placeholderTextColor={colors.textLight4}
                />
                <View style={styles.replyFormMetaRow}>
                  <View style={styles.sendMetaRight}>
                    {adRewardAvailable ? (
                      <TouchableOpacity
                        style={styles.replyFormChip}
                        onPress={handleAdReward}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="television-classic"
                          size={15}
                          color={colors.text}
                        />
                        <Text style={styles.replyFormChipText}>x 2</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.replyFormCount}>
                      {mailContent.length}/{charLimit}자
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SendSchoolMailScreen;
