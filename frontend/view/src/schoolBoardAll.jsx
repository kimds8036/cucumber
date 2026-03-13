import React, { useMemo, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { createSchoolBoardStyles, getNormalize } from '../../styles/schoolBoard.style';
import { colors, fonts } from '../../styles/colors';

// 학교 게시판 전용 더미 데이터
const schoolPosts = [
  {
    id: 101,
    author: '익명',
    time: '1시간 전',
    location: '24m',
    content: '우리 학교 축제 준비할 사람들 모여요! 아이디어 있으면 댓글로 남겨주세요.',
    likes: 32,
    comments: 12,
    liked: false,
  },
  {
    id: 102,
    author: '익명',
    time: '3시간 전',
    location: '',
    content: '내일 체육대회 우천시 진행 여부 아는 사람 있나요?',
    likes: 5,
    comments: 3,
    liked: false,
  },
  {
    id: 103,
    author: '익명',
    time: '어제',
    location: '',
    content: '1학년 자율학습실 자리 널널한가요?',
    likes: 0,
    comments: 1,
    liked: false,
  },
  {
    id: 104,
    author: '익명',
    time: '어제',
    location: '',
    content: '1학년 자율학습실 자리 널널한가요?',
    likes: 0,
    comments: 1,
    liked: false,
  },
  {
    id: 105,
    author: '익명',
    time: '어제',
    location: '',
    content: '1학년 자율학습실 자리 널널한가요?',
    likes: 0,
    comments: 1,
    liked: false,
  },
  {
    id: 106,
    author: '익명',
    time: '어제',
    location: '',
    content: '1학년 자율학습실 자리 널널한가요?',
    likes: 0,
    comments: 1,
    liked: false,
  },
];

const SchoolBoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolBoardStyles(width, normalize), [width]);

  const [sortType, setSortType] = useState('latest'); // latest, popular, nearby
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [floatingMenuPost, setFloatingMenuPost] = useState(null);
  const menuButtonRefs = useRef({});

  const defaultMenuItems = useMemo(
    () => [
      { label: '쪽지 보내기', iconName: 'chatbubble-outline', onPress: () => {} },
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
    ],
    []
  );

  const openFloatingMenu = (post, ref) => {
    ref?.measureInWindow((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuPost(post);
      setFloatingMenuVisible(true);
    });
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
    setFloatingMenuPost(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title="학교 게시판"
        onBack={() => navigation?.goBack()}
        rightIcon="search"
        onRightPress={() => navigation?.navigate('SearchScreen')}
        rightElement={
          <Ionicons name="search" size={normalize(22)} color={colors.textPrimary} />
        }
      />

      {/* 정렬 버튼 영역 */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'latest' && styles.sortButtonActive]}
          onPress={() => setSortType('latest')}
        >
          <Text style={[styles.sortButtonText, sortType === 'latest' && styles.sortButtonTextActive]}>
            최신
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'popular' && styles.sortButtonActive]}
          onPress={() => setSortType('popular')}
        >
          <Text style={[styles.sortButtonText, sortType === 'popular' && styles.sortButtonTextActive]}>
            인기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <ScrollView
        style={styles.postList}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {schoolPosts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('BoardDetail', {
                post: { ...post, author: post.id === 101 ? '작성자' : post.author },
                isMyPost: post.id === 101,
              })
            }
          >
            {/* 게시글 헤더: 좌측 익명•시간, 우측 위치 */}
            <View style={styles.postHeader}>
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postDot}>•</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              {post.location ? (
                <View style={styles.postLocation}>
                  <Ionicons name="location-sharp" size={normalize(12)} color={colors.textSecondary} />
                  <Text style={styles.postLocationText}>{post.location}</Text>
                </View>
              ) : null}
            </View>

            {/* 게시글 내용 */}
            <Text style={styles.postContent} numberOfLines={3}>
              {post.content}
            </Text>

            {/* 경계선 */}
            <View style={styles.postDivider} />

            {/* 푸터: 좌측 좋아요&댓글, 우측 햄버거 */}
            <View style={styles.postFooter}>
              <View style={styles.postStats}>
                <View style={styles.postStatItem}>
                  <FontAwesome
                    name={post.liked ? 'heart' : 'heart-o'}
                    size={normalize(14)}
                    color={colors.alert}
                  />
                  <Text style={styles.postStatText}>{post.likes}</Text>
                </View>
                <View style={styles.postStatItem}>
                  <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                  <Text style={styles.postStatText}>{post.comments}</Text>
                </View>
              </View>
              <View
                ref={(r) => {
                  if (r) menuButtonRefs.current[post.id] = r;
                }}
                collapsable={false}
              >
                <TouchableOpacity
                  style={styles.menuButton}
                  activeOpacity={0.7}
                  onPress={() => openFloatingMenu(post, menuButtonRefs.current[post.id])}
                  hitSlop={{ top: normalize(12), bottom: normalize(12), left: normalize(12), right: normalize(12) }}
                >
                  <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 글쓰기 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BoardWrite', { from: 'SchoolBoardAll' })}
      >
        <FontAwesome5 name="plus" size={normalize(24)} color={colors.background} />
      </TouchableOpacity>

      {/* 플로팅 메뉴 */}
      <Modal
        visible={floatingMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFloatingMenu}
      >
        <TouchableWithoutFeedback onPress={closeFloatingMenu}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: normalize(12),
                  minWidth: width * 0.45,
                  maxWidth: width * 0.7,
                  paddingVertical: normalize(4),
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 5,
                  ...(floatingMenuAnchor
                    ? {
                        position: 'absolute',
                        right: width - floatingMenuAnchor.x,
                        top: floatingMenuAnchor.y,
                      }
                    : {}),
                }}
              >
                {defaultMenuItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: normalize(10),
                        paddingHorizontal: normalize(14),
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (item.onPress) item.onPress();
                        closeFloatingMenu();
                      }}
                    >
                      <Text
                        style={{
                          fontSize: normalize(13),
                          fontFamily: fonts.regular,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Ionicons
                        name={item.iconName}
                        size={normalize(17)}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {index < defaultMenuItems.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.textLight10,
                          marginHorizontal: normalize(8),
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default SchoolBoardAll;

