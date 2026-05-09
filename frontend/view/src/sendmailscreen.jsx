import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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

const SendMailScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);
  const [recipientId, setRecipientId] = useState('');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState([]);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [mailContent, setMailContent] = useState('');
  const [charLimit, setCharLimit] = useState(50);
  const [sending, setSending] = useState(false);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [recipientSectionHeight, setRecipientSectionHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);

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
    const parsedRecipientId = Number(recipientId || selectedUser?.id);
    if (!Number.isInteger(parsedRecipientId) || parsedRecipientId <= 0) {
      Alert.alert('알림', '받는 사람 ID를 숫자로 입력해주세요.');
      return;
    }
    if (!mailContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    try {
      setSending(true);
      await api.post('/api/mails/personal', {
        recipientId: parsedRecipientId,
        content: mailContent.trim(),
      });
      console.log('[SendMail] personal 전송 성공:', { recipientId: parsedRecipientId, length: mailContent.trim().length });
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
        console.log('[SendMail] schools/search 응답:', res.data?.data);
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

  useEffect(() => {
    const q = userQuery.trim();
    if (!selectedSchool?.id || !q) {
      setUserResults([]);
      setUserError('');
      return;
    }
    const t = setTimeout(async () => {
      try {
        setUserLoading(true);
        setUserError('');
        const res = await api.get('/api/users/search', {
          params: { schoolId: selectedSchool.id, query: q, limit: 10 },
        });
        console.log('[SendMail] users/search 응답:', res.data?.data);
        setUserResults(res.data?.data?.users || []);
      } catch (error) {
        setUserError(error.response?.data?.message || '유저 검색 중 오류가 발생했습니다.');
        setUserResults([]);
      } finally {
        setUserLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [selectedSchool?.id, userQuery]);

  // 전체 높이 기준으로 내용 섹션 최소 높이 계산
  const scrollPadding = 16 * 2; // ScrollView contentContainerStyle 상하 padding (raw 값 기준)
  const sectionGap = 12 * 3; // 섹션 간 marginBottom (raw 값 기준)
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}>
        <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />
      </View>
      <View style={styles.keyboardView}>
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.sendScrollContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={Keyboard.dismiss}
            bottomOffset={Math.max(bottomCtaHeight, 16)}
          >
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
                    <Text
                      style={styles.sendInlineErrorText}
                    >
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
                      setUserQuery('');
                      setUserResults([]);
                      setSelectedUser(null);
                      setUserError('');
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
              ) : !selectedUser ? (
                <View>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="person-outline"
                      size={normalize(20)}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.input, { marginLeft: normalize(6) }]}
                      placeholder="실명 전체 입력"
                      value={userQuery}
                      onChangeText={setUserQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {userLoading && (
                    <Loading style={styles.loadingBelowInput} />
                  )}
                  {!!userError && (
                    <Text
                      style={styles.sendInlineErrorText}
                    >
                      {userError}
                    </Text>
                  )}
                  {userResults.length > 0 && (
                    <View
                      style={{
                        marginTop: normalize(8),
                        borderWidth: 1,
                        borderColor: '#EEE',
                        borderRadius: normalize(10),
                        backgroundColor: '#FFF',
                      }}
                    >
                      {userResults.map((user, index) => {
                        const rowName = user?.name ?? user?.displayName ?? '';
                        return (
                          <TouchableOpacity
                            key={user.id}
                            style={{
                              paddingHorizontal: normalize(12),
                              paddingVertical: normalize(10),
                              borderBottomWidth:
                                index === userResults.length - 1 ? 0 : 1,
                              borderBottomColor: '#F2F2F2',
                            }}
                            onPress={() => {
                              setSelectedUser(user);
                              setRecipientId(String(user.id));
                              setUserResults([]);
                            }}
                          >
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontFamily: fonts.regular,
                            }}
                          >
                            {rowName}
                          </Text>
                            {/* 둘째 줄: 학교명 학년 반 */}
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: normalize(12),
                                fontFamily: fonts.regular,
                                marginTop: normalize(2),
                              }}
                            >
                              {user.grade
                                ? ` ${user.grade}학년 ${
                                    user.class ?? ''
                                  }반`
                                : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {!userLoading &&
                    !userError &&
                    userQuery.trim().length > 0 &&
                    userResults.length === 0 && (
                      <Text style={styles.sendInlineHelperText}>
                        일치하는 사용자가 없습니다. 실명을 정확히 입력해 주세요.
                      </Text>
                    )}
                </View>
              ) : (
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="person-outline"
                    size={normalize(20)}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.input,
                      { marginLeft: normalize(6) },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedUser?.name ?? selectedUser?.displayName ?? ''}
                    {selectedUser?.username || selectedUser?.loginId ? (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fonts.regular,
                        }}
                      >
                        {` @${
                          selectedUser?.username ?? selectedUser?.loginId ?? ''
                        }`}
                      </Text>
                    ) : null}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      setSelectedUser(null);
                      setRecipientId('');
                      setUserQuery('');
                      setUserResults([]);
                      setUserError('');
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
                  placeholder="보낼 내용을 입력하세요"
                  value={mailContent}
                  onChangeText={handleMailContentChange}
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
                        // 광고 시청 완료 시 아래 보상 지급 함수 호출
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
          </KeyboardAwareScrollView>

          <View
            style={styles.bottomCtaWrapper}
            onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              style={[
                styles.bottomCtaButton,
                (!mailContent.trim() || !selectedUser || sending) &&
                  styles.bottomCtaDisabled,
              ]}
              onPress={handleSend}
              disabled={!mailContent.trim() || !selectedUser || sending}
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

export default SendMailScreen;