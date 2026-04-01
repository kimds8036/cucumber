import React, { useState, useMemo, useRef, useEffect, Fragment } from 'react';
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
import { colors, fonts, fontSizes } from '../../styles/colors';

const BoardWrite = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createWriteStyles(width, normalize),
    [width, normalize],
  );

  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState([]); // 추가된 해시태그 배열 (서버에는 tags로 전달)
  const [hashtagInput, setHashtagInput] = useState(''); // 입력 중인 해시태그
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]); // 추천 태그 목록
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'tag' | null
  const [tagPanelVisible, setTagPanelVisible] = useState(false);
  const [tagPanelHeight, setTagPanelHeight] = useState(0);
  const boardContext = route?.params?.boardContext || 'national';
  const tagInputRef = useRef(null);
  const tagPanelAnim = useRef(new Animated.Value(0)).current;
  const [driverMode, setDriverMode] = useState(true);

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
    setHashtags((prev) => [...prev, tag]);
    setHashtagInput('');
  };

  // 해시태그 삭제
  const handleRemoveHashtag = (tag) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
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
    const clean = String(tagName || '')
      .replace(/^#/, '')
      .trim();
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
      mediaTypes: 'images',
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
  };

  useEffect(() => {
    if (activePanel === 'tag') {
      setTagPanelVisible(true);
      // Reset animation value when changing driver mode
      if (driverMode) {
        setDriverMode(false);
        tagPanelAnim.setValue(0);
      }
      Animated.timing(tagPanelAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(tagPanelAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setTagPanelVisible(false);
      });
    }
  }, [activePanel, tagPanelAnim, driverMode]);

  useEffect(() => {
    // 태그 패널이 열릴 때 자동으로 키보드를 올리지 않도록
    // 기존의 tagInput 자동 focus 로직을 제거했습니다.
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
      hashtags.forEach((tag) => formData.append('tags[]', tag));
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
        error.response?.data?.message || '게시글 작성 중 오류가 발생했습니다.',
      );
    }
  };

  const guideBlock = (
    <View style={styles.box2}>
      <View style={styles.guideContainer}>
        <Text style={styles.guideText}>비방/욕설 게시글은 </Text>
        <TouchableOpacity
          onPress={() => {
            /* TODO: 가이드 페이지로 이동 */
          }}
        >
          <Text style={styles.guideLink}>커뮤니티 가이드</Text>
        </TouchableOpacity>
        <Text style={styles.guideText}>에 따라 삭제될 수 있어요</Text>
      </View>
    </View>
  );

  const writeMainColumn = (
    <Fragment>
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
    </Fragment>
  );

  const topToolbarSection = useMemo(
    () => (
      <View
        style={[styles.topToolbarSection, styles.topToolbarSectionWithZIndex]}
      >
        {/* 하단 툴바 */}
        <View style={styles.topToolbar}>
          <TouchableOpacity
            onPress={handleToggleTagPanel}
            style={styles.toolbarIconButton}
          >
            <Ionicons
              name="pricetag-outline"
              size={22}
              color={
                activePanel === 'tag' ? colors.primary : colors.textSecondary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePressPhoto}
            style={styles.toolbarIconButton}
          >
            <Ionicons
              name="image-outline"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleLocation}
            style={styles.toolbarLocationButton}
          >
            <Ionicons
              name={locationEnabled ? 'location-sharp' : 'location-outline'}
              size={22}
              color={locationEnabled ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* 칩 영역: 사진 -> 태그 */}

        {postImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStripContent}
            keyboardShouldPersistTaps="handled"
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
                  onPress={() =>
                    setPostImages((prev) => prev.filter((_, i) => i !== index))
                  }
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
            contentContainerStyle={[
              styles.writeHashtagTagList,
              styles.hashtagTagListWithPadding,
            ]}
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
          <View
            style={[
              styles.writeHashtagSuggestionWrapper,
              styles.hashtagSuggestionSectionTop,
            ]}
          >
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
                  <Text style={styles.writeHashtagSuggestionText}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {(tagPanelVisible || tagPanelHeight === 0) && (
          <Animated.View
            pointerEvents={tagPanelVisible ? 'box-none' : 'none'}
            style={{
              height: tagPanelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, tagPanelHeight],
              }),
              overflow: 'hidden',
              zIndex: 20,
              elevation: 20,
            }}
          >
            {/* 높이 측정용 - 한 번만 측정 */}
            {tagPanelHeight === 0 && (
              <View
                style={{ position: 'absolute', opacity: 0, width: '100%' }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  console.log('measured:', h);
                  if (h > 0) setTagPanelHeight(h);
                }}
              >
                <View style={[styles.tagPanelContainer]}>
                  <View
                    style={[
                      styles.writeHashtagWrapper,
                      styles.tagPanelWrapperCompact,
                    ]}
                  >
                    <View style={styles.writeHashtagInputRow}>
                      <Text style={styles.writeHashtagPrefix}>#</Text>
                      <View style={styles.writeHashtagDashedWrap} />
                      <Text style={styles.writeHashtagCounter}>0/5</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 실제 패널 */}
            <View
              style={[
                styles.tagPanelContainer,
                styles.tagPanelContainerWithZIndex,
              ]}
              collapsable={false}
            >
              <View
                style={[
                  styles.writeHashtagWrapper,
                  styles.tagPanelWrapperCompact,
                ]}
              >
                <View style={styles.writeHashtagInputRow}>
                  <Text style={styles.writeHashtagPrefix}>#</Text>
                  <View
                    style={[
                      styles.writeHashtagDashedWrap,
                      styles.writeHashtagDashedWrapWithZIndex,
                    ]}
                  >
                    <TextInput
                      ref={tagInputRef}
                      style={styles.writeHashtagInputInline}
                      placeholder="태그 추가"
                      placeholderTextColor={colors.textSecondary}
                      value={hashtagInput}
                      onChangeText={handleHashtagInputChange}
                      onSubmitEditing={handleAddHashtag}
                      returnKeyType="done"
                      maxLength={30}
                      textAlignVertical="center"
                      underlineColorAndroid="transparent"
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
    ),
    [
      activePanel,
      tagPanelVisible,
      hashtags,
      hashtagInput,
      postImages,
      locationEnabled,
      hashtagSuggestions,
      loadingSuggestions,
    ],
  );

  const canSubmit = content.trim().length > 0 || postImages.length > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.fullFlex}>
            <SafeAreaView style={styles.container} edges={['top']}>
              <SubHeader
                title="글쓰기"
                onBack={handleBack}
                onRightPress={handleComplete}
                rightDisabled={!canSubmit}
                rightElement={
                  <View
                    style={[
                      styles.completePill,
                      !canSubmit && styles.completePillDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.completePillText,
                        !canSubmit && styles.completePillTextDisabled,
                      ]}
                    >
                      등록
                    </Text>
                  </View>
                }
              />

              <ScrollView
                style={styles.fullFlex}
                contentContainerStyle={styles.scrollContentGrow}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={Keyboard.dismiss}
              >
                {writeMainColumn}
              </ScrollView>

              {topToolbarSection}
              {guideBlock}
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BoardWrite;
