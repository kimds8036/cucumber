import { mockPostDetail } from '../data/mockPostDetail';
import { PostDetail } from '../types';

// 게시글 상세 조회
export const fetchPostDetail = async (postId: number): Promise<PostDetail> => {
  // TODO: 나중에 백엔드 API 연동
  // const response = await fetch(`/api/posts/${postId}`);
  // return response.json();
  
  // 지금은 Mock 데이터 반환
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockPostDetail), 500);
  });
};

// 댓글 작성
export const addComment = async (postId: number, content: string): Promise<void> => {
  // TODO: 나중에 백엔드 API 연동
  // await fetch(`/api/posts/${postId}/comments`, {
  //   method: 'POST',
  //   body: JSON.stringify({ content }),
  // });
  
  console.log('댓글 작성:', postId, content);
};

// 좋아요
export const likePost = async (postId: number): Promise<void> => {
  // TODO: 나중에 백엔드 API 연동
  console.log('좋아요:', postId);
};