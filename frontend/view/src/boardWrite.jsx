import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Animated,
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
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [activePanel, setActivePanel] = useState(null); // 'tag' | null
  const [tagPanelVisible, setTagPanelVisible] = useState(false);
  const boardContext = route?.params?.boardContext || 'national';
  const tagInputRef = useRef(null);
  const tagPanelAnim = useRef(new Animated.Value(0)).current;

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

  const handleToggleTagPanel = () => {
    setActivePanel((prev) => (prev === 'tag' ? null : 'tag'));
  };

  const handlePressPhoto = async () => {
    setActivePanel(null);
    await handlePickPostImages();
  };

  const handleToggleLocation = async () => {
    setActivePanel(null);
    const next = !locationEnabled;
    setLocationEnabled(next);
    setLocationText(next ? '위치 사용중' : '');
  };

  useEffect(() => {
    if (activePanel === 'tag') {
      setTagPanelVisible(true);
      Animated.timing(tagPanelAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(tagPanelAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTagPanelVisible(false);
      });
    }
  }, [activePanel, tagPanelAnim]);

  useEffect(() => {
    if (activePanel === 'tag') {
      const t = setTimeout(() => {
        tagInputRef.current?.focus();
      }, 220);
      return () => clearTimeout(t);
    }
  }, [activePanel]);

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
    </>
  );

  const topToolbarSection = (
    <View style={styles.topToolbarSection}>
      {/* 상단 툴바 */}
      <View style={styles.topToolbar}>
        <TouchableOpacity onPress={handleToggleTagPanel} style={styles.toolbarIconButton}>
          <Ionicons
            name="pricetag-outline"
            size={22}
            color={activePanel === 'tag' ? colors.primary : colors.textSecondary}
          />
          {hashtags.length > 0 && (
            <View style={styles.toolbarBadge}>
              <Text style={styles.toolbarBadgeText}>
                {hashtags.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePressPhoto} style={styles.toolbarIconButton}>
          <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
          {postImages.length > 0 && (
            <View style={styles.toolbarBadge}>
              <Text style={styles.toolbarBadgeText}>
                {postImages.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToggleLocation} style={styles.toolbarLocationButton}>
          <Ionicons
            name="location-outline"
            size={22}
            color={locationEnabled ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* 칩 영역: 위치 -> 사진 -> 태그 */}
      {locationEnabled && !!locationText && (
        <View style={styles.locationChipWrap}>
          <View style={styles.writeHashtagTagChip}>
            <Text style={styles.writeHashtagTagText}>{locationText}</Text>
          </View>
        </View>
      )}

      {postImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStripContent}
        >
          {postImages.length < 5 && (
            <TouchableOpacity
              onPress={handlePressPhoto}
              style={styles.photoAddButton}
            >
              <Ionicons name="add" size={20} color="#888" />
            </TouchableOpacity>
          )}
          {postImages.map((uri, index) => (
            <View key={index} style={styles.photoItemWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity
                onPress={() => setPostImages((prev) => prev.filter((_, i) => i !== index))}
                style={styles.photoDeleteButton}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {hashtags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.writeHashtagTagScroll}
          contentContainerStyle={[styles.writeHashtagTagList, styles.hashtagTagListWithPadding]}
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

      {activePanel === 'tag' && hashtagSuggestions.length > 0 && (
        <View style={[styles.writeHashtagSuggestionWrapper, styles.hashtagSuggestionSectionTop]}>
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

      {tagPanelVisible && (
        <Animated.View
          style={{
            transform: [
              {
                translateY: tagPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
            opacity: tagPanelAnim,
          }}
        >
          <View style={styles.tagPanelContainer}>
            <View style={[styles.writeHashtagWrapper, styles.tagPanelWrapperCompact]}>
              <View style={styles.writeHashtagInputRow}>
                <Text style={styles.writeHashtagPrefix}>#</Text>
                <View style={styles.writeHashtagDashedWrap}>
                  <TextInput
                    ref={tagInputRef}
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
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );

  const canSubmit = content.trim().length > 0 || postImages.length > 0;

  return (
    <View style={styles.screen}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.fullFlex}>
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

              <ScrollView
                style={styles.fullFlex}
                contentContainerStyle={styles.scrollContentGrow}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {writeMainColumn}
              </ScrollView>

              {topToolbarSection}
              {guideBlock}
            </SafeAreaView>

          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default BoardWrite;