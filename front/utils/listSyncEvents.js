import { DeviceEventEmitter } from 'react-native';

const BOARD_POST_LIKE = 'listSync/boardPostLike';
const BOARD_POST_SCRAP = 'listSync/boardPostScrap';
const SCHOOL_MAIL_LIKE = 'listSync/schoolMailLike';

export function emitBoardPostLike(postId, liked, likes) {
  DeviceEventEmitter.emit(BOARD_POST_LIKE, { postId, liked, likes });
}

export function emitBoardPostScrap(postId, scrapped, scrapCount) {
  DeviceEventEmitter.emit(BOARD_POST_SCRAP, { postId, scrapped, scrapCount });
}

export function emitSchoolMailLike(mailId, liked, likeCount) {
  DeviceEventEmitter.emit(SCHOOL_MAIL_LIKE, { mailId, liked, likeCount });
}

export function subscribeBoardPostLike(handler) {
  const sub = DeviceEventEmitter.addListener(BOARD_POST_LIKE, handler);
  return () => sub.remove();
}

export function subscribeBoardPostScrap(handler) {
  const sub = DeviceEventEmitter.addListener(BOARD_POST_SCRAP, handler);
  return () => sub.remove();
}

export function subscribeSchoolMailLike(handler) {
  const sub = DeviceEventEmitter.addListener(SCHOOL_MAIL_LIKE, handler);
  return () => sub.remove();
}
