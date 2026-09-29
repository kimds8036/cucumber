import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardEvents,
} from 'react-native-keyboard-controller';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StackActions } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import SortChips from '../../components/common/SortChips';
import ImageViewer from './ImageViewer';
import { createWriteStyles, getNormalize } from '../../styles/board.style';
import { api } from '../../utils/api';
import { invalidateProfileCountsCache } from '../../utils/profileCountsCache';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import * as Location from 'expo-location';

const BOARD_OPTIONS = [
  { value: 'national', label: '전체' },
  { value: 'student', label: '학생' },
  { value: 'school', label: '학교' },
];

const BOARD_HINTS = {
  national: '모든 사람들이 볼 수 있어요',
  student: '학생들만 볼 수 있어요',
  school: '우리 학교 학생들만 볼 수 있어요',
};

const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 10;

const createPollOptions = () => ['', ''];

const DUMMY_HASHTAGS = ['중간고사', '수행평가', '급식'];


const BoardWrite = ({ navigation, route }) => {
  const { studentVerificationStatus } = useAuth();
  const studentBoardEnabled = studentVerificationStatus === 'APPROVED';
  const { coords, refreshLocation } = useLocationContext();
  const { width, height } = useWindowDimensions();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(createPollOptions);
  const [pollMulti, setPollMulti] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);
  const boardContext = route?.params?.boardContext || 'national';
  const [selectedBoard, setSelectedBoard] = useState('national');
  const scrollRef = useRef(null);
  const bodyInputRef = useRef(null);
  const hashtagFieldRef = useRef(null);
  const pollRowRefs = useRef([]);
  const scrollOffsetRef = useRef(0);
  const focusedFieldRef = useRef(null);

  useEffect(() => {
    if (!studentBoardEnabled) {
      setSelectedBoard('national');
      return;
    }
    if (boardContext === 'school' || boardContext === 'student') {
      setSelectedBoard(boardContext);
    }
  }, [studentBoardEnabled, boardContext]);

  const scrollFocusedFieldIntoView = useCallback(() => {
    const field = focusedFieldRef.current;
    const scroll = scrollRef.current;
    if (!field?.measureInWindow || typeof scroll?.scrollTo !== 'function') {
      return;
    }
    field.measureInWindow((_x, y, _width, fieldHeight) => {
      const keyboardHeight = KeyboardController.state().height || 0;
      const visibleBottom = height - keyboardHeight - 24;
      const overlap = y + fieldHeight - visibleBottom;
      if (overlap <= 0) return;
      const fitsAboveKeyboard = fieldHeight <= visibleBottom - 24;
      const delta = fitsAboveKeyboard
        ? overlap
        : Math.min(overlap, Math.max(0, y - 12));
      if (delta <= 0) return;
      scroll.scrollTo({
        y: scrollOffsetRef.current + delta,
        animated: true,
      });
    });
  }, [height]);

  useEffect(() => {
    const subscription = KeyboardEvents.addListener('keyboardDidShow', () => {
      if (focusedFieldRef.current) scrollFocusedFieldIntoView();
    });
    return () => subscription.remove();
  }, [scrollFocusedFieldIntoView]);

  const handleFieldFocus = (field) => {
    if (!field) return;
    focusedFieldRef.current = field;
    const wait = KeyboardController.isVisible()
      ? 0
      : Math.max(KeyboardController.state().duration || 0, 280);
    setTimeout(() => {
      if (focusedFieldRef.current === field) scrollFocusedFieldIntoView();
    }, wait);
  };

  const handleFieldBlur = (field) => {
    if (focusedFieldRef.current === field) focusedFieldRef.current = null;
  };

  const handleBoardChange = (next) => {
    if (next !== 'national' && !studentBoardEnabled) {
      Alert.alert('알림', '학생증 인증을 해주세요');
      return;
    }
    setSelectedBoard(next);
  };

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

  const handlePressPhoto = async () => {
    await handlePickPostImages();
  };

  const handleToggleLocation = () => {
    setLocationEnabled((prev) => !prev);
  };

  const resetPoll = () => {
    setPollOpen(false);
    setPollOptions(createPollOptions());
    setPollMulti(false);
  };

  const handlePressPoll = () => {
    if (!pollOpen) {
      setPollOpen(true);
      return;
    }
    Alert.alert('삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: resetPoll,
      },
    ]);
  };

  const handleChangePollOption = (index, text) => {
    setPollOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? text : option,
      ),
    );
  };

  const handleAddPollOption = () => {
    setPollOptions((prev) =>
      prev.length >= POLL_MAX_OPTIONS ? prev : [...prev, ''],
    );
  };

  const handleRemovePollOption = (index) => {
    setPollOptions((prev) =>
      prev.length <= POLL_MIN_OPTIONS
        ? prev
        : prev.filter((_, optionIndex) => optionIndex !== index),
    );
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      let boardType = 'national';
      let schoolId = null;

      const boardForSubmit = studentBoardEnabled ? selectedBoard : 'national';

      if (boardForSubmit === 'school') {
        const schoolRes = await api.get('/api/schools/me');
        const id = schoolRes.data?.data?.id;
        if (!id) {
          Alert.alert('오류', '학교 정보를 불러올 수 없습니다.');
          return;
        }
        boardType = 'school';
        schoolId = id;
      } else if (boardForSubmit === 'student') {
        boardType = 'student';
      }

      const formData = new FormData();
      formData.append('boardType', boardType);
      if (schoolId) formData.append('schoolId', String(schoolId));
      formData.append('content', content);
      hashtags.forEach((tag) => formData.append('tags[]', tag));
      postImages.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      if (locationEnabled) {
        let lat = coords?.latitude;
        let lng = coords?.longitude;
        if (lat == null || lng == null) {
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            await refreshLocation();
          } catch {
            lat = null;
            lng = null;
          }
        }
        if (lat != null && lng != null) {
          formData.append('includeLocation', 'true');
          formData.append('latitude', String(lat));
          formData.append('longitude', String(lng));
        }
      }
      await api.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await invalidateProfileCountsCache();

      Keyboard.dismiss();
      Alert.alert('완료', '게시글이 작성되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            if (boardContext === 'school') {
              navigation.dispatch(StackActions.pop(1));
            } else {
              navigation.dispatch(StackActions.popToTop());
            }
          },
        },
      ]);
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      const code = error.response?.data?.code;
      Alert.alert(
        '오류',
        code === 'STUDENT_VERIFICATION_REQUIRED'
          ? '학생 인증이 필요한 게시판입니다. 학생인증해 주세요.'
          : error.response?.data?.message ||
              '게시글 작성 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const guideBlock = (
    <View style={styles.box2}>
      <View style={styles.guideContainer}>
        <Text style={styles.guideText}>
          비방/욕설 게시글은 커뮤니티 가이드에 따라 삭제될 수 있어요
        </Text>
      </View>
    </View>
  );

  const writeMainColumn = (
    <View style={styles.writeComposer}>
      <View style={[styles.writeBodyBox, styles.writeBodyBoxGrow]}>
        <TextInput
          ref={bodyInputRef}
          style={styles.writeBodyInput}
          placeholder="내용을 입력해 주세요"
          placeholderTextColor={colors.textLight4}
          multiline
          value={content}
          onChangeText={setContent}
          onFocus={() => handleFieldFocus(bodyInputRef.current)}
          onBlur={() => handleFieldBlur(bodyInputRef.current)}
        />
        {pollOpen ? (
          <View style={styles.pollBox}>
            {pollOptions.map((option, index) => (
              <View
                key={`poll-option-${index}`}
                style={styles.pollOptionRow}
                ref={(node) => {
                  pollRowRefs.current[index] = node;
                }}
              >
                <TextInput
                  style={styles.pollOptionInput}
                  placeholder={`항목 ${index + 1}`}
                  placeholderTextColor={colors.textLight4}
                  value={option}
                  onChangeText={(text) => handleChangePollOption(index, text)}
                  onFocus={() => handleFieldFocus(pollRowRefs.current[index])}
                  onBlur={() => handleFieldBlur(pollRowRefs.current[index])}
                  maxLength={50}
                />
                {pollOptions.length > POLL_MIN_OPTIONS ? (
                  <TouchableOpacity
                    onPress={() => handleRemovePollOption(index)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textLight4} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {pollOptions.length < POLL_MAX_OPTIONS ? (
              <TouchableOpacity
                style={styles.pollAddButton}
                onPress={handleAddPollOption}
              >
                <Text style={styles.pollAddButtonText}>+ 항목 추가</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.pollMultiRow}
              onPress={() => setPollMulti((prev) => !prev)}
            >
              <View
                style={[styles.pollCheckbox, pollMulti && styles.pollCheckboxOn]}
              >
                {pollMulti ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : null}
              </View>
              <Text style={styles.pollMultiLabel}>복수 선택</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {postImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.writeBodyPhotoScroll}
            contentContainerStyle={styles.writeBodyPhotoStrip}
            keyboardShouldPersistTaps="handled"
          >
            {postImages.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoItemWrap}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setViewerUri(uri)}
                >
                  <Image source={{ uri }} style={styles.photoThumb} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setPostImages((prev) => prev.filter((_, i) => i !== index))
                  }
                  style={styles.photoDeleteButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.white}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.writeBodyActions}>
          <TouchableOpacity
            onPress={handleToggleLocation}
            style={styles.toolbarLocationButton}
            hitSlop={8}
          >
            <Ionicons
              name={locationEnabled ? 'location-sharp' : 'location-outline'}
              size={22}
              color={locationEnabled ? colors.primary : colors.textLight4}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePressPhoto}
            style={styles.toolbarIconButton}
            hitSlop={8}
          >
            <Ionicons
              name={postImages.length > 0 ? 'image' : 'image-outline'}
              size={postImages.length > 0 ? 24 : 22}
              color={postImages.length > 0 ? colors.primary : colors.textLight4}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePressPoll}
            style={styles.toolbarIconButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={pollOpen ? 'vote' : 'vote-outline'}
              size={22}
              color={pollOpen ? colors.primary : colors.textLight4}
            />
          </TouchableOpacity>
        </View>
      </View>
      {guideBlock}
      <View style={styles.writeHashtagBlock}>
        <View ref={hashtagFieldRef} style={styles.writeHashtagField}>
          <Text style={styles.writeHashtagPrefix}>#</Text>
          <TextInput
            style={styles.writeHashtagFieldInput}
            placeholder="해시태그 입력(선택)"
            placeholderTextColor={colors.textLight4}
            value={hashtagInput}
            onChangeText={handleHashtagInputChange}
            onFocus={() => handleFieldFocus(hashtagFieldRef.current)}
            onBlur={() => handleFieldBlur(hashtagFieldRef.current)}
            onSubmitEditing={handleAddHashtag}
            returnKeyType="done"
            maxLength={30}
          />
          <Text style={styles.writeHashtagCounter}>{hashtags.length}/5</Text>
        </View>
        {hashtagSuggestions.length > 0 ? (
          <View style={styles.writeHashtagSuggestionWrapper}>
            <Text style={styles.writeHashtagSuggestionTitle}>
              {loadingSuggestions ? '태그 불러오는 중...' : '추천 태그'}
            </Text>
            <View style={styles.writeHashtagTagList}>
              {hashtagSuggestions.map((tag) => (
                <TouchableOpacity
                  key={tag.id ?? tag.name}
                  style={styles.writeHashtagSuggestionChip}
                  onPress={() => handleSelectSuggestion(tag.name)}
                >
                  <Text style={styles.writeHashtagSuggestionText}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
        {hashtags.length > 0 ? (
          <View style={styles.writeHashtagTagList}>
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
          </View>
        ) : null}
        <View style={styles.writeHashtagRecommend}>
          <Text style={styles.writeHashtagSuggestionTitle}>추천 해시태그</Text>
          <View style={styles.writeHashtagTagList}>
            {DUMMY_HASHTAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.writeHashtagRecommendChip}
                onPress={() => handleSelectSuggestion(tag)}
              >
                <Text style={styles.writeHashtagRecommendText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const canSubmit =
    (content.trim().length > 0 || postImages.length > 0) && !isSubmitting;

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <View style={styles.screen}>
        <View style={styles.keyboardAvoiding}>
          <View style={styles.fullFlex}>
            <SafeAreaView style={styles.container} edges={['top']}>
              <SubHeader
                title="게시글 작성"
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
                      {isSubmitting ? '•••' : '완료'}
                    </Text>
                  </View>
                }
              />

              <KeyboardAwareScrollView
                ref={scrollRef}
                style={styles.fullFlex}
                contentContainerStyle={styles.scrollContentGrow}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                }}
                onScrollBeginDrag={Keyboard.dismiss}
                bottomOffset={16}
              >
                <SortChips
                  value={selectedBoard}
                  onChange={handleBoardChange}
                  options={BOARD_OPTIONS}
                  containerStyle={{ paddingBottom: 0 }}
                />
                <Text style={styles.boardScopeHint}>
                  {BOARD_HINTS[selectedBoard]}
                </Text>
                {writeMainColumn}
              </KeyboardAwareScrollView>
            </SafeAreaView>
            <ImageViewer
              visible={Boolean(viewerUri)}
              uri={viewerUri}
              onClose={() => setViewerUri(null)}
            />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BoardWrite;
