import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CommonActions } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors, fonts } from '../../styles/colors';
import Loading from '../../components/Loading';
import { api, getApiUserFacingMessage } from '../../utils/api';
import { buildSendMailPrefill } from '../../utils/personalMail';
import { usePersonalMailCharLimit } from '../../hooks/usePersonalMailCharLimit';

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
  const { charLimit, adRewardAvailable, guardTextLength, handleAdReward } =
    usePersonalMailCharLimit();
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [recipientSectionHeight, setRecipientSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);
  const bottomCtaHeightRef = useRef(0);
  const prefillAppliedRef = useRef(false);

  const scrollBottomInset =
    bottomCtaHeight > 0 ? bottomCtaHeight : normalize(72);

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
    if (p.school?.id || p.school?.name) setSelectedSchool(p.school);
    if (p.grade) setRecipientGrade(p.grade);
    if (p.classNumber) setRecipientClass(p.classNumber);
    if (p.name) setRecipientName(p.name);
    if (p.content) setMailContent(p.content);
    if (p.recipientUsername) setRecipientUsername(p.recipientUsername);
  }, [prefill]);

  const handleMailContentChange = (text) => {
    if (!guardTextLength(text)) return;
    setMailContent(text);
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
      const payload = {
        school_id: selectedSchool.id,
        grade: Number(recipientGrade),
        class_num: Number(recipientClass),
        name: recipientName.trim(),
        content: mailContent.trim(),
      };
      const username = recipientUsername.trim();
      if (showHomonymUI && username) payload.user_id = username;

      await api.post('/api/mails/personal/send', payload);

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
      const code = error?.response?.data?.code;
      if (
        error?.response?.status === 409 &&
        (code === 'DUPLICATE_RECIPIENT' ||
          error?.response?.data?.status === 'DUPLICATE')
      ) {
        setShowHomonymUI(true);
        return;
      }
      Alert.alert(
        '오류',
        getApiUserFacingMessage(error, '우편 전송 중 오류가 발생했습니다.'),
      );
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
        const res = await api.get('/api/schools/search', {
          params: { query: q, limit: 5 },
        });
        setSchoolResults(res.data?.data?.schools || []);
      } catch (error) {
        setSchoolError(
          error.response?.data?.message || '학교 검색 중 오류가 발생했습니다.',
        );
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
    normalize(200),
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
            {/* 섹션 1: 보낼 학교 */}
            <View
              style={styles.section}
              onLayout={(e) =>
                setSchoolSectionHeight(e.nativeEvent.layout.height)
              }
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
                  {schoolLoading && (
                    <Loading style={styles.loadingBelowInput} />
                  )}
                  {!!schoolError && (
                    <Text style={styles.sendInlineErrorText}>
                      {schoolError}
                    </Text>
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
                            borderBottomWidth:
                              index === schoolResults.length - 1 ? 0 : 1,
                            borderBottomColor: '#F2F2F2',
                          }}
                          onPress={() => {
                            setSelectedSchool(school);
                            setSchoolQuery('');
                            setSchoolResults([]);
                          }}
                        >
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontFamily: fonts.bold,
                            }}
                          >
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
                      <Text style={styles.sendInlineHelperText}>
                        검색 결과 없음
                      </Text>
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

            {/* 섹션 2: 받는 사람 */}
            <View
              style={styles.section}
              onLayout={(e) =>
                setRecipientSectionHeight(e.nativeEvent.layout.height)
              }
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
                    style={[
                      styles.input,
                      { opacity: 0.4, marginLeft: normalize(6) },
                    ]}
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
                      <View
                        style={[
                          styles.inputWrapper,
                          { marginTop: normalize(10) },
                        ]}
                      >
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
              style={[
                styles.section,
                { flex: 1, minHeight: contentSectionMinHeight },
              ]}
            >
              <Text style={styles.label}>내용</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="보낼 내용을 입력해주세요"
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
                    {adRewardAvailable ? (
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
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.replyFormChipTextNotice}>받는 사람을 잘못 입력하면 반송될 수 있어요</Text>
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
              (!canSend || sending) && styles.bottomCtaDisabled,
            ]}
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
      </View>
    </SafeAreaView>
  );
};

export default SendMailScreen;
