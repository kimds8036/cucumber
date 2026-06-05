import { Alert } from 'react-native';
import { api } from './api';

export function filterPostsExcludingUser(posts, blockedUserId) {
  const id = Number(blockedUserId);
  if (!Number.isFinite(id)) return posts;
  return (posts || []).filter(
    (p) => Number(p.author_user_id ?? p.authorUserId) !== id,
  );
}

export function filterCommentTreeExcludingUser(comments, blockedUserId) {
  const id = Number(blockedUserId);
  if (!Number.isFinite(id)) return comments;
  const walk = (list) =>
    (list || [])
      .filter((c) => Number(c.userId) !== id)
      .map((c) => ({
        ...c,
        replies: c.replies?.length ? walk(c.replies) : [],
      }));
  return walk(comments);
}

/** 차단 API만 호출 (확인 모달 없음) */
export async function blockUserById(blockedUserId, { reason = null } = {}) {
  const targetId = Number(blockedUserId);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    throw new Error('INVALID_USER_ID');
  }
  await api.post(`/api/friends/${targetId}/block`, {
    ...(reason ? { reason } : {}),
  });
  return true;
}

/**
 * @returns {Promise<boolean>} 차단 API 성공 여부
 */
export function confirmAndBlockUser(blockedUserId, { label = '해당 사용자' } = {}) {
  const targetId = Number(blockedUserId);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    Alert.alert(
      '차단',
      `${label}님을 차단할까요?\n차단하면 게시글과 댓글이 더 이상 보이지 않습니다.`,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUserById(targetId);
              Alert.alert('차단 완료', '차단되었습니다.');
              resolve(true);
            } catch (error) {
              console.error('사용자 차단 실패:', error);
              Alert.alert(
                '오류',
                error?.response?.data?.message ||
                  '사용자 차단 중 오류가 발생했습니다.',
              );
              resolve(false);
            }
          },
        },
      ],
    );
  });
}
