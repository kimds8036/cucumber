import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { createSchoolBoardStyles, getNormalize } from '../../styles/schoolBoard.style';
import { colors, fonts } from '../../styles/colors';
import { api } from '../../utils/api';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 변환. 화면에서는 기기 로컬 시간 기준으로 계산 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // 타임존 문자가 없으면 UTC로 간주해 Z(=+00:00) 를 붙인다.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

const SchoolBoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolBoardStyles(width, normalize), [width]);

  const [sortType, setSortType] = useState('latest'); // latest, popular
  const [schoolPosts, setSchoolPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [floatingMenuPost, setFloatingMenuPost] = useState(null);
  const menuButtonRefs = useRef({});

  const defaultMenuItemsOthers = useMemo(
    () => [
      { label: '쪽지 보내기', iconName: 'chatbubble-outline' },
      { label: '공유하기', iconName: 'share-outline' },
      { label: '신고하기', iconName: 'flag-outline' },
    ],
    []
  );

  const defaultMenuItemsMine = useMemo(
    () => [
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
      {
        label: '삭제하기',
        iconName: 'trash-outline',
        onPress: () => {
          const postToDelete = floatingMenuPost;
          closeFloatingMenu();
          if (!postToDelete) return;
          Alert.alert(
            '게시글 삭제',
            '이 게시글을 삭제할까요?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.delete(`/api/posts/${postToDelete.id}`);
                    setSchoolPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
                    Alert.alert('삭제됨', '게시글이 삭제되었습니다.');
                  } catch (error) {
                    console.error('게시글 삭제 오류:', error);
                    Alert.alert(
                      '오류',
                      error.response?.data?.message || '게시글 삭제 중 오류가 발생했습니다.'
                    );
                  }
                },
              },
            ]
          );
        },
      },
    ],
    [floatingMenuPost]
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

  const startNoteToPostAuthorFromList = async (post) => {
    if (!post?.authorUserId || !post?.id) {
      Alert.alert('오류', '쪽지를 보낼 수 없습니다.');
      return;
    }
    try {
      const res = await api.post('/api/messages/rooms', {
        postId: post.id,
        otherUserId: post.authorUserId,
      });
      const room = res.data?.data;
      if (!room?.id) {
        Alert.alert('오류', '쪽지 방 정보를 불러올 수 없습니다.');
        return;
      }
      closeFloatingMenu();
      navigation?.navigate('Chat', { roomId: room.id });
    } catch (error) {
      console.error('쪽지방 생성/조회 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '쪽지방을 여는 중 오류가 발생했습니다.'
      );
    }
  };

  const handleShareFromList = async (post) => {
    if (!post?.id) return;
    const url = `${api.defaults.baseURL}/posts/${post.id}`;
    try {
      await Share.share({
        message: `오늘의 이야기 게시글을 공유합니다.\n\n${url}`,
        url,
        title: '오늘의 이야기 게시글',
      });
    } catch (error) {
      console.error('게시글 공유 실패:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchSchoolPosts = async () => {
      try {
        setLoading(true);
        const schoolRes = await api.get('/api/schools/me');
        const schoolId = schoolRes.data?.data?.id;
        if (!schoolId) {
          if (mounted) setSchoolPosts([]);
          return;
        }
        const sortParam = sortType === 'popular' ? 'popular' : 'latest';
        const postsRes = await api.get('/api/posts', {
          params: {
            boardType: 'school',
            schoolId,
            sort: sortParam,
            page: 1,
            limit: 50,
          },
        });
        if (!mounted) return;
        const apiPosts = postsRes.data?.data?.posts || [];
        const mapped = apiPosts.map((p) => ({
          id: p.id,
          author: '익명',
          time: formatTimeAgo(p.created_at),
          location: '',
          content: p.content,
          likes: p.like_count,
          comments: p.comment_count,
          liked: false,
          isMyPost: !!p.is_author,
          authorUserId: p.author_user_id,
        }));
        setSchoolPosts(mapped);
      } catch (error) {
        console.error('학교 게시판 목록 로드 실패:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSchoolPosts();
    return () => {
      mounted = false;
    };
  }, [sortType]);

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
        {loading && schoolPosts.length === 0 ? (
          <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
              게시글을 불러오는 중입니다...
            </Text>
          </View>
        ) : schoolPosts.length > 0 ? (
          schoolPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postItem}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('BoardDetail', {
                  post: { ...post, author: post.author },
                  isMyPost: post.isMyPost ?? false,
                })
              }
            >
            {/* 게시글 헤더: 좌측 익명 시간, 우측 위치 */}
            <View style={styles.postHeader}>
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postTime}> {post.time}</Text>
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
          ))
        ) : (
          <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
              아직 학교 게시판에 글이 없습니다.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 글쓰기 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BoardWrite', { boardContext: 'school' })}
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
                {((floatingMenuPost?.isMyPost) ? defaultMenuItemsMine : defaultMenuItemsOthers).map((item, index) => (
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
                        if (item.label === '쪽지 보내기') {
                          startNoteToPostAuthorFromList(floatingMenuPost);
                        } else if (item.label === '공유하기') {
                          handleShareFromList(floatingMenuPost);
                        } else if (item.onPress) {
                          item.onPress();
                        }
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
                    {index < ((floatingMenuPost?.isMyPost) ? defaultMenuItemsMine : defaultMenuItemsOthers).length - 1 && (
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

