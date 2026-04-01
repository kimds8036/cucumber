import React, { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';

const SendMailScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
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
  const [sending, setSending] = useState(false);

  const handleMailContentChange = (text) => {
    if (text.length > 50) {
      Alert.alert('알림', '광고를 보면 더 길게 작성할 수 있어요.');
      return;
    }
    setMailContent(text);
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
          onPress: () => navigation?.goBack(),
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
        const res = await api.get('/api/schools/search', { params: { query: q, limit: 10 } });
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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: normalize(40), paddingHorizontal: normalize(16), paddingTop: normalize(16) }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.section, { marginTop: 0 }]}>
              <Text style={styles.label}>받는 사람</Text>
              {!selectedSchool ? (
                <View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="학교 검색하기"
                      value={schoolQuery}
                      onChangeText={setSchoolQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {schoolLoading && <Loading style={{ marginTop: normalize(8) }} />}
                  {!!schoolError && (
                    <Text style={{ marginTop: normalize(8), color: '#E74C3C', fontSize: normalize(12) }}>
                      {schoolError}
                    </Text>
                  )}
                  {schoolResults.length > 0 && (
                    <View style={{ marginTop: normalize(8), borderWidth: 1, borderColor: '#EEE', borderRadius: normalize(10), backgroundColor: '#FFF' }}>
                      {schoolResults.map((school) => (
                        <TouchableOpacity
                          key={school.id}
                          style={{ paddingHorizontal: normalize(12), paddingVertical: normalize(10), borderBottomWidth: 1, borderBottomColor: '#F2F2F2' }}
                          onPress={() => {
                            setSelectedSchool(school);
                            setSchoolQuery('');
                            setSchoolResults([]);
                          }}
                        >
                          <Text style={{ color: colors.textPrimary }}>{school.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: normalize(12) }}>{school.region || '-'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {!schoolLoading && !schoolError && schoolQuery.trim().length > 0 && schoolResults.length === 0 && (
                    <Text style={{ marginTop: normalize(8), color: colors.textSecondary, fontSize: normalize(12) }}>
                      검색 결과 없음
                    </Text>
                  )}
                </View>
              ) : !selectedUser ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(8), gap: normalize(8) }}>
                    <View style={{ backgroundColor: '#EEF4FF', borderRadius: normalize(14), paddingHorizontal: normalize(10), paddingVertical: normalize(6), flexDirection: 'row', alignItems: 'center', gap: normalize(6) }}>
                      <Text style={{ color: colors.textPrimary, fontSize: normalize(12) }}>{selectedSchool.name}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedSchool(null);
                          setSelectedUser(null);
                          setRecipientId('');
                          setUserQuery('');
                          setUserResults([]);
                          setUserError('');
                        }}
                      >
                        <Text style={{ color: colors.textSecondary }}>x</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="아이디 또는 이름으로 검색"
                      value={userQuery}
                      onChangeText={setUserQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {userLoading && <Loading style={{ marginTop: normalize(8) }} />}
                  {!!userError && (
                    <Text style={{ marginTop: normalize(8), color: '#E74C3C', fontSize: normalize(12) }}>
                      {userError}
                    </Text>
                  )}
                  {userResults.length > 0 && (
                    <View style={{ marginTop: normalize(8), borderWidth: 1, borderColor: '#EEE', borderRadius: normalize(10), backgroundColor: '#FFF' }}>
                      {userResults.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={{ paddingHorizontal: normalize(12), paddingVertical: normalize(10), borderBottomWidth: 1, borderBottomColor: '#F2F2F2' }}
                          onPress={() => {
                            setSelectedUser(user);
                            setRecipientId(String(user.id));
                            setUserResults([]);
                          }}
                        >
                          <Text style={{ color: colors.textPrimary }}>{user.displayName}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: normalize(12) }}>
                            {user.schoolName}{user.grade ? ` · ${user.grade}학년 ${user.class ?? ''}반` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {!userLoading && !userError && userQuery.trim().length > 0 && userResults.length === 0 && (
                    <Text style={{ marginTop: normalize(8), color: colors.textSecondary, fontSize: normalize(12) }}>
                      해당 학교에 가입된 유저가 없습니다
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(8) }}>
                  <View style={{ backgroundColor: '#EEF4FF', borderRadius: normalize(14), paddingHorizontal: normalize(10), paddingVertical: normalize(6), flexDirection: 'row', alignItems: 'center', gap: normalize(6), flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: normalize(12), flex: 1 }} numberOfLines={1}>
                      {selectedUser.displayName} · {selectedUser.schoolName}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedUser(null);
                        setRecipientId('');
                        setUserQuery('');
                      }}
                    >
                      <Text style={{ color: colors.textSecondary }}>x</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="받는 사람 검색하기"
                  value={recipientId}
                  onChangeText={setRecipientId}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={[styles.section, { flex: 1, marginBottom: normalize(8) }]}>
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
                  <View style={{ marginLeft: 'auto', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
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

          <View style={styles.bottomCtaWrapper}>
            <TouchableOpacity
              style={[
                styles.bottomCtaButton,
                (!mailContent.trim() || !selectedUser || sending) && styles.bottomCtaDisabled,
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SendMailScreen;