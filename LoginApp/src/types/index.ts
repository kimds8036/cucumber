export interface Board {
  id: number;
  name: string;
  icon: string;
}

export interface TabItem {
  id: string;
  icon: string;
  label: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  createdAt: string;
  isPinned?: boolean;
}

// 새로 추가
export interface Comment {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface PostDetail extends Post {
  commentList: Comment[];
}