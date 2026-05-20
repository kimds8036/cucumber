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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CommonActions } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors, fonts } from '../../styles/colors';
import Loading from '../../components/Loading';
import { api } from '../../utils/api';
import { buildSendMailPrefill } from '../../utils/personalMail';

const SendMailScreen = ({ navigation, route }) => {
  const prefill = route?.params?.prefill;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState([]);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [recipientGrade, setRecipientGrade] = useState('');
  const [recipientClass, setRecipientClass] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [showHomonymUI, setShowHomonymUI] = useState(false);
  const [mailContent, setMailContent] = useState('');
  const [charLimit, setCharLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [recipientSectionHeight, setRecipientSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contentFocused, setContentFocused] = useState(false);
  const [contentSectionLayout, setContentSectionLayout] = useState({ y: 0, height: 0 });
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const contentSectionRef = useRef(null);
  const prefillAppliedRef = useRef(false);
  const contentScrollTimersRef = useRef([]);

  const recipientFilled =
    recipientGrade.trim().length > 0 &&
    recipientClass.trim().length > 0 &&
    recipientName.trim().length > 0;

  const canSend =
    selectedSchool &&
    recipientFilled &&
    mailContent.trim().length > 0 &&
    (!showHomonymUI || recipientUsername.trim().length > 0);

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    const p = buildSendMailPrefill({ prefillMeta: prefill });
    if (p.school?.name) setSelectedSchool(p.school);
    if (p.grade) setRecipientGrade(p.grade);
    if (p.classNumber) setRecipientClass(p.classNumber);
    if (p.name) setRecipientName(p.name);
    if (p.content) setMailContent(p.content);
    if (p.recipientUsername) setRecipientUsername(p.recipientUsername);
  }, [prefill]);

  const updateContentSectionLayout = useCallback(() => {
    const section = contentSectionRef.current;
    const content = scrollContentRef.current;
    if (!section || !content) return;
    section.measureLayout(content, (_x, y, _w, h) => {
      setContentSectionLayout({ y, height: h });
    });
  }, []);

  /** 매번 measureLayout으로 위치를 잡아 재포커스 시에도 스크롤이 동작하게 함 */
  const scrollContentSectionToVisibleTop = useCallback(() => {
    const section = contentSectionRef.current;
    const content = scrollContentRef.current;
    if (!section || !content || !scrollRef.current) return;

    section.measureLayout(content, (_x, y) => {
      const topInset = normalize(8);
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - topInset),
        animated: true,
      });
    });
  }, [normalize]);

  const scheduleContentScrollIntoView = useCallback(() => {
    contentScrollTimersRef.current.forEach(clearTimeout);
    updateContentSectionLayout();
    const delays = Platform.OS === 'ios' ? [0, 50, 120, 280] : [0, 120, 280, 450];
    contentScrollTimersRef.current = delays.map((ms) =>
      setTimeout(scrollContentSectionToVisibleTop, ms),
    );
  }, [updateContentSectionLayout, scrollContentSectionToVisibleTop]);

  useEffect(
    () => () => {
      contentScrollTimersRef.current.forEach(clearTimeout);
    },
    [],
  );

  const handleContentFocus = useCallback(() => {
    setContentFocused(true);
    scheduleContentScrollIntoView();
  }, [scheduleContentScrollIntoView]);

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
  }, [
    schoolSectionHeight,
    recipientSectionHeight,
    showHomonymUI,
    updateContentSectionLayout,
  ]);

  useEffect(() => {
    if (!keyboardOpen || !contentFocused) return;
    scheduleContentScrollIntoView();
  }, [keyboardOpen, contentFocused, keyboardHeight, scheduleContentScrollIntoView]);

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

  const resetRecipientFields = () => {
    setRecipientGrade('');
    setRecipientClass('');
    setRecipientName('');
    setRecipientUsername('');
    setShowHomonymUI(false);
  };

  const handleSend = async () => {
    if (!selectedSchool?.id) {
      Alert.alert('알림', '보낼 학교를 선택해주세요.');
      return;
    }
    if (!recipientFilled) {
      Alert.alert('알림', '학년, 반, 이름을 모두 입력해주세요.');
      return;
    }
    if (!mailContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (showHomonymUI && !recipientUsername.trim()) {
      Alert.alert('알림', '아이디를 입력해주세요.');
      return;
    }

    try {
      setSending(true);
      // TODO: POST /api/mails/personal
      // payload: {
      //   schoolId: selectedSchool.id,
      //   grade: Number(recipientGrade),
      //   classNumber: Number(recipientClass),
      //   recipientName: recipientName.trim(),
      //   recipientUsername: showHomonymUI ? recipientUsername.trim() : undefined,
      //   content: mailContent.trim(),
      // }
      // 프로덕션 반송: 수신자 미확인 시 7일 후 반송 (백엔드 job)
      // const RETURN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
      // schedulePersonalMailReturn(mailId, RETURN_AFTER_MS);
      // 테스트 반송: personalMail.js 의 PERSONAL_MAIL_TEST_IMMEDIATE_RETURN = true
      // 동명이인 응답 시 (예: code === 'DUPLICATE_RECIPIENT'):
      //   setShowHomonymUI(true);
      //   return;

      Alert.alert('완료', '우편이 전송되었습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main', params: { initialTab: 'message' } }],
              }),
            ),
        },
      ]);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '우편 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const q = schoolQuery.trim();
    if (!q) {
      setSchoolResults([]);
      setSchoolError('');
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSchoolLoading(true);
        setSchoolError('');
        const res = await api.get('/api/schools/search', { params: { query: q, limit: 5 } });
        setSchoolResults(res.data?.data?.schools || []);
      } catch (error) {
        setSchoolError(error.response?.data?.message || '학교 검색 중 오류가 발생했습니다.');
        setSchoolResults([]);
      } finally {
        setSchoolLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [schoolQuery]);

  const scrollPadding = 16 * 2;
  const sectionGap = 12 * 3;
  const contentSectionMinHeight = Math.max(
    200,
    height -
      insets.top -
      insets.bottom -
      subHeaderHeight -
      schoolSectionHeight -
      recipientSectionHeight -
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
            contentFocused ? Math.max(bottomCtaHeight, normalize(16)) : normalize(16)
          }
        >
          <View ref={scrollContentRef} collapsable={false}>
            {/* 섹션 1: 보낼 학교 */}
            <View
              style={styles.section}
              onLayout={(e) => setSchoolSectionHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.label}>보낼 학교</Text>
              {!selectedSchool ? (
                <View>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons
                      name="school-outline"
                      size={normalize(18)}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.input, { marginLeft: normalize(6) }]}
                      placeholder="학교 검색하기"
                      value={schoolQuery}
                      onChangeText={setSchoolQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {schoolLoading && <Loading style={styles.loadingBelowInput} />}
                  {!!schoolError && (
                    <Text style={styles.sendInlineErrorText}>{schoolError}</Text>
                  )}
                  {schoolResults.length > 0 && (
                    <View
                      style={{
                        marginTop: normalize(8),
                        borderWidth: 1,
                        borderColor: '#EEE',
                        borderRadius: normalize(10),
                        backgroundColor: '#FFF',
                      }}
                    >
                      {schoolResults.map((school, index) => (
                        <TouchableOpacity
                          key={school.id}
                          style={{
                            paddingHorizontal: normalize(12),
                            paddingVertical: normalize(10),
                            borderBottomWidth: index === schoolResults.length - 1 ? 0 : 1,
                            borderBottomColor: '#F2F2F2',
                          }}
                          onPress={() => {
                            setSelectedSchool(school);
                            setSchoolQuery('');
                            setSchoolResults([]);
                          }}
                        >
                          <Text style={{ color: colors.textPrimary, fontFamily: fonts.bold }}>
                            {school.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: normalize(12),
                              fontFamily: fonts.regular,
                            }}
                          >
                            {school.region || '-'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {!schoolLoading &&
                    !schoolError &&
                    schoolQuery.trim().length > 0 &&
                    schoolResults.length === 0 && (
                      <Text style={styles.sendInlineHelperText}>검색 결과 없음</Text>
                    )}
                </View>
              ) : (
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={normalize(18)}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { marginLeft: normalize(6) }]}
                    value={selectedSchool.name}
                    editable={false}
                    pointerEvents="none"
                  />
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      setSelectedSchool(null);
                      setSchoolQuery('');
                      setSchoolResults([]);
                      resetRecipientFields();
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={normalize(18)}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 섹션 2: 받는 사람 (학년 / 반 / 이름) */}
            <View
              style={styles.section}
              onLayout={(e) => setRecipientSectionHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.label}>받는 사람</Text>
              {!selectedSchool ? (
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="person-outline"
                    size={normalize(20)}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { opacity: 0.4, marginLeft: normalize(6) }]}
                    placeholder="학교를 먼저 선택하세요"
                    editable={false}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              ) : (
                <View>
                  <View style={styles.recipientFieldsRow}>
                    <View style={styles.recipientFieldWrapper}>
                      <View style={styles.recipientGradeClassInner}>
                        <View style={styles.recipientSubField}>
                          <TextInput
                            style={styles.recipientFieldInput}
                            placeholder="학년"
                            value={recipientGrade}
                            onChangeText={setRecipientGrade}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>
                        <View style={styles.recipientSubField}>
                          <TextInput
                            style={styles.recipientFieldInput}
                            placeholder="반"
                            value={recipientClass}
                            onChangeText={setRecipientClass}
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={styles.namerecipientFieldWrapper}>
                      <TextInput
                        style={styles.recipientFieldInput}
                        placeholder="이름"
                        value={recipientName}
                        onChangeText={setRecipientName}
                        maxLength={20}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {showHomonymUI ? (
                    <>
                      <Text style={styles.homonymNoticeText}>
                        동명이인이 있습니다. 아이디를 추가로 입력해주세요
                      </Text>
                      <View style={[styles.inputWrapper, { marginTop: normalize(10) }]}>
                        <MaterialIcons
                          name="alternate-email"
                          size={normalize(20)}
                          color={colors.textSecondary}
                        />
                        <TextInput
                          style={[styles.input, { marginLeft: normalize(6) }]}
                          placeholder="아이디 입력"
                          value={recipientUsername}
                          onChangeText={setRecipientUsername}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </>
                  ) : null}
                </View>
              )}
            </View>

            {/* 섹션 3: 내용 */}
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
          style={[styles.bottomCtaWrapper, { paddingBottom: Math.max(normalize(16), insets.bottom) }]}
          onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
        >
          <TouchableOpacity
            style={[styles.bottomCtaButton, (!canSend || sending) && styles.bottomCtaDisabled]}
            onPress={handleSend}
            disabled={!canSend || sending}
            activeOpacity={0.9}
          >
            {sending ? (
              <Loading color={colors.background} />
            ) : (
              <Text style={styles.bottomCtaText}>
                {showHomonymUI ? '재전송' : '전송하기'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SendMailScreen;
