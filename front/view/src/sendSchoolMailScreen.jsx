import React, { useMemo, useState, useRef } from 'react';
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
import { CommonActions } from '@react-navigation/native';
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

  const schoolId = route?.params?.schoolId ?? null;
  const schoolName = route?.params?.schoolName ?? '';
  const sourceScreen = route?.params?.sourceScreen ?? null;

  const [mailContent, setMailContent] = useState('');
  const [charLimit, setCharLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);
  const bottomCtaHeightRef = useRef(0);

  const scrollBottomInset =
    bottomCtaHeight > 0 ? bottomCtaHeight : normalize(72);

  const handleMailContentChange = (text) => {
    if (text.length > charLimit) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setMailContent(text);
  };

  const handleAdReward = () => {
    setCharLimit((prev) => prev * 2);
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
            if (sourceScreen === 'OtherSchool') {
              navigation?.dispatch(
                CommonActions.reset({
                  index: 2,
                  routes: [
                    { name: 'Main', params: { initialTab: 'school' } },
                    { name: 'OtherSchool', params: { schoolId, schoolName } },
                    {
                      name: 'SchoolMailbox',
                      params: {
                        schoolId,
                        schoolName,
                        sourceScreen: 'OtherSchool',
                      },
                    },
                  ],
                }),
              );
              return;
            }
            navigation?.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  { name: 'Main', params: { initialTab: 'school' } },
                  { name: 'SchoolMailbox', params: { schoolId, schoolName } },
                ],
              }),
            );
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
      bottomCtaHeight -
      scrollPadding -
      sectionGap,
  );

  const handleBottomCtaLayout = (e) => {
    const next = e.nativeEvent.layout.height;
    if (Math.abs(next - bottomCtaHeightRef.current) < 1) return;
    bottomCtaHeightRef.current = next;
    setBottomCtaHeight(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
        <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />
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
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.replyFormMetaRow}>
                  <View style={styles.sendMetaRight}>
                    <Text style={styles.replyFormCount}>
                      {mailContent.length}/{charLimit}자
                    </Text>
                    <TouchableOpacity
                      style={styles.replyFormChip}
                      onPress={handleAdReward}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="television-classic"
                        size={15}
                        color={colors.textPrimary}
                      />
                      <Text style={styles.replyFormChipText}>x 2</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>

        <View
          style={[
            styles.bottomCtaWrapper,
            { paddingBottom: Math.max(normalize(16), insets.bottom) },
          ]}
          onLayout={handleBottomCtaLayout}
        >
          <TouchableOpacity
            style={[
              styles.bottomCtaButton,
              (!mailContent.trim() || !schoolId || sending) &&
                styles.bottomCtaDisabled,
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
    </SafeAreaView>
  );
};

export default SendSchoolMailScreen;
