import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
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

  /** 학교 우편함 등에서 navigate 시 전달 (별도 조회 API 없음) */
  const schoolId = route?.params?.schoolId ?? null;
  const schoolName = route?.params?.schoolName ?? '';
  const sourceScreen = route?.params?.sourceScreen ?? null;

  const [mailContent, setMailContent] = useState('');
  const [charLimit, setCharLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contentFocused, setContentFocused] = useState(false);
  const [contentSectionLayout, setContentSectionLayout] = useState({ y: 0, height: 0 });
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const contentSectionRef = useRef(null);

  const updateContentSectionLayout = useCallback(() => {
    const section = contentSectionRef.current;
    const content = scrollContentRef.current;
    if (!section || !content) return;
    section.measureLayout(content, (_x, y, _w, h) => {
      setContentSectionLayout({ y, height: h });
    });
  }, []);

  /** 「내용」 라벨이 키보드 위 가시 영역 상단에 오도록 */
  const scrollContentSectionToVisibleTop = useCallback(() => {
    if (!contentFocused || keyboardHeight <= 0) return;
    const { y: sectionY } = contentSectionLayout;
    if (sectionY <= 0 && contentSectionLayout.height <= 0) return;

    const topInset = normalize(8);
    const targetScrollY = sectionY - topInset;

    scrollRef.current?.scrollTo({
      y: Math.max(0, targetScrollY),
      animated: true,
    });
  }, [contentFocused, keyboardHeight, contentSectionLayout, normalize]);

  const handleContentFocus = useCallback(() => {
    setContentFocused(true);
  }, []);

  const handleContentBlur = useCallback(() => {
    setContentFocused(false);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    updateContentSectionLayout();
  }, [schoolSectionHeight, updateContentSectionLayout]);

  useEffect(() => {
    if (!keyboardOpen || !contentFocused) return;
    const timer = setTimeout(
      scrollContentSectionToVisibleTop,
      Platform.OS === 'ios' ? 50 : 120,
    );
    return () => clearTimeout(timer);
  }, [keyboardOpen, contentFocused, keyboardHeight, scrollContentSectionToVisibleTop]);

  const handleMailContentChange = (text) => {
    if (text.length > charLimit) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setMailContent(text);
  };

  const handleAdReward = () => {
    setCharLimit(prev => prev * 2);
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
                      params: { schoolId, schoolName, sourceScreen: 'OtherSchool' },
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
        <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        automaticOffset
        enabled={contentFocused}
      >
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.sendScrollContent,
            {
              paddingBottom: contentFocused
                ? Math.max(bottomCtaHeight, normalize(16))
                : normalize(16),
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          bottomOffset={
            contentFocused
              ? Math.max(bottomCtaHeight, normalize(16))
              : normalize(16)
          }
        >
          <View ref={scrollContentRef} collapsable={false}>
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
              ref={contentSectionRef}
              style={[styles.section, { flex: 1, minHeight: contentSectionMinHeight }]}
              onLayout={updateContentSectionLayout}
            >
              <Text style={styles.label}>내용</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="보낼 내용을 입력하세요"
                  value={mailContent}
                  onChangeText={handleMailContentChange}
                  onFocus={handleContentFocus}
                  onBlur={handleContentBlur}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.replyFormMetaRow}>
                  <View style={styles.sendMetaRight}>
                    <Text style={styles.replyFormCount}>{mailContent.length}/{charLimit}자</Text>
                    <TouchableOpacity
                      style={styles.replyFormChip}
                      onPress={() => {
                        // 나중에 애드몹 RewardedAd 로직으로 교체할 자리
                        handleAdReward();
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="television-classic" size={15} color={colors.textPrimary} />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SendSchoolMailScreen;
