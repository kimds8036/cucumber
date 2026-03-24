import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SubHeader from '../frame/subHeader';
import { createWriteStyles, getNormalize } from '../../styles/board.style';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';

const BoardWrite = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createWriteStyles(width, normalize), [width, normalize]);

  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState([]);       // 추가된 해시태그 배열 (서버에는 tags로 전달)
  const [hashtagInput, setHashtagInput] = useState(''); // 입력 중인 해시태그
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]); // 추천 태그 목록
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const boardContext = route?.params?.boardContext || 'national';

  const handleBack = () => {
    navigation.goBack();
  };

  // 해시태그 추가
  const handleAddHashtag = () => {
    const tag = hashtagInput.replace(/^#/, '').trim();
    if (!tag) return;
    if (hashtags.includes(tag)) {
      setHashtagInput('');
      return;
    }
    if (hashtags.length >= 5) {
      Alert.alert('알림', '해시태그는 최대 5개까지 추가할 수 있어요.');
      return;
    }
    setHashtags(prev => [...prev, tag]);
    setHashtagInput('');
  };

  // 해시태그 삭제
  const handleRemoveHashtag = (tag) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  // 태그 추천 조회
  const fetchHashtagSuggestions = async (text) => {
    const q = text.replace(/^#/, '').trim();
    if (!q) {
      setHashtagSuggestions([]);
      return;
    }
    try {
      setLoadingSuggestions(true);
      const res = await api.get('/api/posts/tags/search', {
        params: { query: q },
      });
      const tags = res.data?.data?.tags || [];
      setHashtagSuggestions(tags);
    } catch (error) {
      console.error('해시태그 추천 조회 오류:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // 입력창에서 스페이스/엔터 입력 시 자동 추가 + 추천 조회
  const handleHashtagInputChange = (text) => {
    if (text.endsWith(' ') || text.endsWith('\n')) {
      handleAddHashtag();
    } else {
      setHashtagInput(text);
      fetchHashtagSuggestions(text);
    }
  };

  const handleSelectSuggestion = (tagName) => {
    const clean = String(tagName || '').replace(/^#/, '').trim();
    if (!clean) return;
    if (hashtags.includes(clean)) {
      setHashtagInput('');
      setHashtagSuggestions([]);
      return;
    }
    if (hashtags.length >= 5) {
      Alert.alert('알림', '해시태그는 최대 5개까지 추가할 수 있어요.');
      return;
    }
    setHashtags((prev) => [...prev, clean]);
    setHashtagInput('');
    setHashtagSuggestions([]);
  };

  const handlePickPostImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPostImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const handleComplete = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    try {
      let boardType = 'national';
      let schoolId = null;

      if (boardContext === 'school') {
        const schoolRes = await api.get('/api/schools/me');
        const id = schoolRes.data?.data?.id;
        if (!id) {
          Alert.alert('오류', '학교 정보를 불러올 수 없습니다.');
          return;
        }
        boardType = 'school';
        schoolId = id;
      }

      const formData = new FormData();
      formData.append('boardType', boardType);
      if (schoolId) formData.append('schoolId', String(schoolId));
      formData.append('content', content.trim());
      hashtags.forEach(tag => formData.append('tags[]', tag));
      postImages.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      await api.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('완료', '게시글이 작성되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            if (boardContext === 'school') {
              navigation.navigate('SchoolBoardAll');
            } else {
              navigation.navigate('Main');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '게시글 작성 중 오류가 발생했습니다.'
      );
    }
  };

  const guideBlock = (
    <View style={styles.box2}>
      <View style={styles.guideContainer}>
        <Text style={styles.guideText}>비방/욕설 게시글은 </Text>
        <TouchableOpacity onPress={() => {/* TODO: 가이드 페이지로 이동 */}}>
          <Text style={styles.guideLink}>커뮤니티 가이드</Text>
        </TouchableOpacity>
        <Text style={styles.guideText}>에 따라 삭제될 수 있어요</Text>
      </View>
    </View>
  );

  const writeMainColumn = (
    <>
      <View style={styles.box} />

      {/* 제목 필드가 있을 때를 가정한 본문 상단 구분선 */}
      <View style={styles.writeBodyTopDivider} />

      {/* 본문 입력 */}
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder="오늘의 이야기를 들려주세요"
          placeholderTextColor={colors.textSecondary}
          multiline
          value={content}
          onChangeText={setContent}
        />
      </View>

      {/* 해시태그 섹션 (본문 아래 · 가이드 위) */}
      <View style={styles.writeHashtagTopDivider} />
      <View style={styles.writeHashtagWrapper}>
        <View style={styles.writeHashtagInputRow}>
          <Text style={styles.writeHashtagPrefix}>#</Text>
          <View style={styles.writeHashtagDashedWrap}>
            <TextInput
              style={styles.writeHashtagInput}
              placeholder="태그 추가"
              placeholderTextColor={colors.textSecondary}
              value={hashtagInput}
              onChangeText={handleHashtagInputChange}
              onSubmitEditing={handleAddHashtag}
              returnKeyType="done"
              maxLength={30}
            />
          </View>
          <Text style={styles.writeHashtagCounter}>
            {hashtags.length}/5
          </Text>
        </View>

        {hashtags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.writeHashtagTagScroll}
            contentContainerStyle={styles.writeHashtagTagList}
            keyboardShouldPersistTaps="handled"
          >
            {hashtags.map((tag) => (
              <View key={tag} style={styles.writeHashtagTagChip}>
                <Text style={styles.writeHashtagTagText}>#{tag}</Text>
                <TouchableOpacity
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => handleRemoveHashtag(tag)}
                >
                  <Text style={styles.writeHashtagTagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {hashtagSuggestions.length > 0 && (
          <View style={styles.writeHashtagSuggestionWrapper}>
            <Text style={styles.writeHashtagSuggestionTitle}>
              {loadingSuggestions ? '태그 불러오는 중...' : '추천 태그'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.writeHashtagTagScroll}
              contentContainerStyle={styles.writeHashtagTagList}
              keyboardShouldPersistTaps="handled"
            >
              {hashtagSuggestions.map((t) => (
                <TouchableOpacity
                  key={t.id ?? t.name}
                  style={styles.writeHashtagSuggestionChip}
                  onPress={() => handleSelectSuggestion(t.name)}
                >
                  <Text style={styles.writeHashtagSuggestionText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {/* 이미지 첨부 UI */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>사진 첨부</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{postImages.length}/5</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={handlePickPostImages}
            disabled={postImages.length >= 5}
            style={{
              width: 80,
              height: 80,
              borderRadius: 10,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: postImages.length >= 5 ? '#CCC' : '#999',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
              backgroundColor: '#FAFAFA',
            }}
          >
            <Ionicons
              name="add"
              size={24}
              color={postImages.length >= 5 ? '#CCC' : '#888'}
            />
          </TouchableOpacity>
          {postImages.map((uri, index) => (
            <View key={index} style={{ marginRight: 8, position: 'relative' }}>
              <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
              <TouchableOpacity
                onPress={() => setPostImages((prev) => prev.filter((_, i) => i !== index))}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: '#000',
                  borderRadius: 10,
                }}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.writeHashtagBottomDivider} />
    </>
  );

  const canSubmit = content.trim().length > 0 || postImages.length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1 }}>
              <SafeAreaView style={styles.container} edges={['top']}>
                <SubHeader
                  title="글쓰기"
                  onBack={handleBack}
                  onRightPress={handleComplete}
                  rightDisabled={!canSubmit}
                  rightElement={(
                    <View style={[styles.completePill, !canSubmit && styles.completePillDisabled]}>
                      <Text style={[styles.completePillText, !canSubmit && styles.completePillTextDisabled]}>
                        등록
                      </Text>
                    </View>
                  )}
                />

                {writeMainColumn}
              </SafeAreaView>

              {guideBlock}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default BoardWrite;