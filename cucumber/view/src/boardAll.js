import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { colors, fonts } from '../../styles/colors';
import { createBoardStyles, getNormalize } from '../../styles/board.style';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const BoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);

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

  // 임시 게시글 데이터 (TODO: DB 연동 시 목록 API에서 post.liked 포함하여 사용)
  const posts = [
    {
      id: 1,
      author: '익명',
      time: '2시간 전',
      location: '24m',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 213,
      comments: 89,
      liked: false,
    },
    {
      id: 2,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 10,
      comments: 0,
      liked: false,
    },
    {
      id: 3,
      author: '익명',
      time: '2시간 전',
      location: '24m',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 0,
      comments: 0,
      liked: false,
    },
    {
      id: 4,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 0,
      comments: 0,
      liked: false,
    },
    {
      id: 5,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 213,
      comments: 89,
      liked: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <MainHeader activeTab="board" />

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
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'nearby' && styles.sortButtonActive]}
          onPress={() => setSortType('nearby')}
        >
          <Text style={[styles.sortButtonText, sortType === 'nearby' && styles.sortButtonTextActive]}>
            근처
          </Text>
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <ScrollView style={styles.postList} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('BoardDetail', {
                post: { ...post, author: post.id === 1 ? '작성자' : post.author },
                isMyPost: post.id === 1, // 본인 글 여부 (추후 로그인 사용자와 비교)
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
        onPress={() => navigation.navigate('BoardWrite')}
      >
        <FontAwesome5 name="plus" size={normalize(24)} color={colors.background} />
      </TouchableOpacity>

      {/* 플로팅 메뉴 (boardAll 인라인 - boardDetail과 동일한 UI) */}
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

      {/* 푸터 */}
      <MainFooter activeTab="board" />
    </SafeAreaView>
  );
};

export default BoardAll;
