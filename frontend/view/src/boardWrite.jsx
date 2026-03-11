import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { createWriteStyles, getNormalize } from '../../styles/board.style';
import { api } from '../../utils/api';

const BoardWrite = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createWriteStyles(width, normalize), [width, normalize]);

  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState([]);       // 추가된 해시태그 배열 (서버에는 tags로 전달)
  const [hashtagInput, setHashtagInput] = useState(''); // 입력 중인 해시태그
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]); // 추천 태그 목록
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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

      await api.post('/api/posts', {
        boardType,
        schoolId: schoolId ?? undefined,
        content: content.trim(),
        // 백엔드는 body.tags 배열을 사용하므로 이름을 맞춰 전달
        tags: hashtags,
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <SubHeader
            title="글쓰기"
            onBack={handleBack}
            rightButtonText="완료"
            onRightPress={handleComplete}
          />

          <View style={styles.box} />

          {/* 본문 입력 */}
          <View style={styles.content}>
            <TextInput
              style={styles.textInput}
              placeholder="오늘의 이야기를 들려주세요"
              placeholderTextColor={styles.placeholder.color}
              multiline
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* 구분선 */}
          <View style={hashtagSectionStyles.divider} />

          {/* 해시태그 섹션 */}
          <View style={hashtagSectionStyles.wrapper}>
            {/* 입력 행 */}
            <View style={hashtagSectionStyles.inputRow}>
              <Text style={hashtagSectionStyles.prefix}>#</Text>
              <TextInput
                style={hashtagSectionStyles.input}
                placeholder="해시태그 추가 (최대 5개)"
                placeholderTextColor="#BDBDBD"
                value={hashtagInput}
                onChangeText={handleHashtagInputChange}
                onSubmitEditing={handleAddHashtag}
                returnKeyType="done"
                maxLength={30}
              />
              {hashtagInput.length > 0 && (
                <TouchableOpacity
                  style={hashtagSectionStyles.addButton}
                  onPress={handleAddHashtag}
                >
                  <Text style={hashtagSectionStyles.addButtonText}>추가</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 추가된 태그 목록 */}
            {hashtags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={hashtagSectionStyles.tagScroll}
                contentContainerStyle={hashtagSectionStyles.tagList}
                keyboardShouldPersistTaps="handled"
              >
                {hashtags.map((tag) => (
                  <View key={tag} style={hashtagSectionStyles.tagChip}>
                    <Text style={hashtagSectionStyles.tagText}>#{tag}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => handleRemoveHashtag(tag)}
                    >
                      <Text style={hashtagSectionStyles.tagRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* 추천 태그 목록 */}
            {hashtagSuggestions.length > 0 && (
              <View style={hashtagSectionStyles.suggestionWrapper}>
                <Text style={hashtagSectionStyles.suggestionTitle}>
                  {loadingSuggestions ? '태그 불러오는 중...' : '추천 태그'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={hashtagSectionStyles.tagScroll}
                  contentContainerStyle={hashtagSectionStyles.tagList}
                  keyboardShouldPersistTaps="handled"
                >
                  {hashtagSuggestions.map((t) => (
                    <TouchableOpacity
                      key={t.id ?? t.name}
                      style={hashtagSectionStyles.suggestionChip}
                      onPress={() => handleSelectSuggestion(t.name)}
                    >
                      <Text style={hashtagSectionStyles.suggestionText}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* 하단 가이드 */}
        <View style={styles.box2}>
          <View style={styles.guideContainer}>
            <Text style={styles.guideText}>비방/욕설 게시글은 </Text>
            <TouchableOpacity onPress={() => {/* TODO: 가이드 페이지로 이동 */}}>
              <Text style={styles.guideLink}>커뮤니티 가이드</Text>
            </TouchableOpacity>
            <Text style={styles.guideText}>에 따라 삭제될 수 있어요</Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

// 해시태그 섹션 전용 인라인 스타일
// → board.style.js 에 옮겨서 normalize 적용하고 싶으면 그쪽으로 이전하세요
const hashtagSectionStyles = {
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prefix: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 4,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  tagScroll: {
    marginTop: 10,
  },
  tagList: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    color: '#4A6FFF',
    fontWeight: '500',
  },
  tagRemove: {
    fontSize: 11,
    color: '#8FA8FF',
    fontWeight: '700',
  },
  suggestionWrapper: {
    marginTop: 10,
  },
  suggestionTitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: '#555',
  },
};

export default BoardWrite;