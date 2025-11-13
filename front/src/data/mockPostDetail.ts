import { PostDetail } from '../types';

export const mockPostDetail: PostDetail = {
  id: 1,
  title: '지금 안 자는 사람',
  content: '나랑 게임하자',
  author: '닉네임 or 익명',
  likes: 12,
  comments: 1,
  createdAt: '25/11/02 23:00',
  commentList: [
    {
      id: 1,
      postId: 1,
      author: '닉네임 or 익명',
      content: '저래',
      createdAt: '25/11/02 23:01',
      likes: 0,
    },
  ],
};