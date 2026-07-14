/**
 * 광고 슬롯 placement 상수 + 폴백 정책.
 * API·훅·UI가 동일한 snake_case ID를 공유한다.
 */

export const AD_PLACEMENTS = {
  LAUNCH_MODAL: 'launch_modal',
  SPLASH: 'splash',
  TOP_BANNER: 'top_banner',
  COMMUTE_BANNER: 'commute_banner',
  FEED_BOARD: 'feed_board',
  FEED_NOTE_MAIL: 'feed_note_mail',
  FEED_SCHOOL_MAIL: 'feed_school_mail',
  FEED_ALERT: 'feed_alert',
  /** 우편 작성 시 글자수 확장용 리워드 영상 */
  MAIL_CHAR_REWARD: 'mail_char_reward',
};

export const AD_PLACEMENT_LIST = Object.values(AD_PLACEMENTS);

/** @typedef {'hide' | 'tip'} AdFallbackPolicy */

/** placement → API 없을 때 동작 */
export const AD_FALLBACK_POLICY = {
  [AD_PLACEMENTS.LAUNCH_MODAL]: 'hide',
  [AD_PLACEMENTS.SPLASH]: 'hide',
  [AD_PLACEMENTS.TOP_BANNER]: 'tip',
  [AD_PLACEMENTS.COMMUTE_BANNER]: 'hide',
  [AD_PLACEMENTS.FEED_BOARD]: 'tip',
  [AD_PLACEMENTS.FEED_NOTE_MAIL]: 'tip',
  [AD_PLACEMENTS.FEED_SCHOOL_MAIL]: 'tip',
  [AD_PLACEMENTS.FEED_ALERT]: 'tip',
  [AD_PLACEMENTS.MAIL_CHAR_REWARD]: 'hide',
};

/** 피드 중간 삽입 간격 (N개마다) */
export const AD_INJECT_EVERY = {
  [AD_PLACEMENTS.FEED_BOARD]: 5,
  [AD_PLACEMENTS.FEED_NOTE_MAIL]: 5,
  [AD_PLACEMENTS.FEED_SCHOOL_MAIL]: 5,
  [AD_PLACEMENTS.FEED_ALERT]: 5,
};

export const AD_PLACEMENT_LABELS = {
  [AD_PLACEMENTS.LAUNCH_MODAL]: '앱 실행 전면 모달',
  [AD_PLACEMENTS.SPLASH]: '스플래시 전면 이미지',
  [AD_PLACEMENTS.TOP_BANNER]: '상단 고정 배너',
  [AD_PLACEMENTS.COMMUTE_BANNER]: '등교중 배너',
  [AD_PLACEMENTS.FEED_BOARD]: '게시판 피드 삽입',
  [AD_PLACEMENTS.FEED_NOTE_MAIL]: '쪽지·개인우편 피드 삽입',
  [AD_PLACEMENTS.FEED_SCHOOL_MAIL]: '학교 우편함 피드 삽입',
  [AD_PLACEMENTS.FEED_ALERT]: '알림 피드 삽입',
  [AD_PLACEMENTS.MAIL_CHAR_REWARD]: '우편 글자수 확장 리워드 영상',
};

/**
 * @param {string} placement
 * @returns {AdFallbackPolicy}
 */
export function getAdFallbackPolicy(placement) {
  return AD_FALLBACK_POLICY[placement] ?? 'hide';
}

/**
 * @param {string} placement
 * @returns {number}
 */
export function getAdInjectEvery(placement) {
  return AD_INJECT_EVERY[placement] ?? 5;
}

export function isKnownAdPlacement(placement) {
  return AD_PLACEMENT_LIST.includes(placement);
}

export function emptyAdsGrouped() {
  return AD_PLACEMENT_LIST.reduce((acc, placement) => {
    acc[placement] = [];
    return acc;
  }, {});
}
