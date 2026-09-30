/**
 * TopAdBanner 배경 에셋 + 왼쪽 두 줄 카피.
 * - 화면 전용 배경은 해당 placement 에서만, all* 는 모든 화면 풀
 * - 문구는 화면별로만 랜덤 (다른 화면 멘트와 섞지 않음). placement 없으면 공통 브랜딩만
 */

export const BANNER_ALL_ASSETS = [
  require('../assets/banner/all.png'),
  require('../assets/banner/all1.png'),
  require('../assets/banner/all2.png'),
  require('../assets/banner/all3.png'),
];

export const BANNER_PLACEMENT_ASSETS = {
  board: require('../assets/banner/board.png'),
  message: require('../assets/banner/message.png'),
  school: require('../assets/banner/school.png'),
  timer: require('../assets/banner/timer.png'),
};

/** 타이머 전용. 랜덤 풀에 넣지 않는다. 게시된 공지가 배너 기간 안일 때만 쓴다. */
export const NOTICE_BANNER_ASSET = require('../assets/banner/notice.png');

export const NOTICE_BANNER_LINE1 = '📢 새 공지가 올라왔어요';

/** 공지 배너 게재 기간. API 광고가 생기면 그 슬롯을 3일만 차지한다. */
export const NOTICE_BANNER_DAYS = 7;
export const NOTICE_BANNER_DAYS_WITH_API_AD = 3;

/** @typedef {'board' | 'message' | 'school' | 'timer'} BannerPlacement */
/** @typedef {{ line1: string, line2: string }} BannerCopy */

/** @type {Record<BannerPlacement, BannerCopy[]>} */
export const BANNER_COPY_BY_PLACEMENT = {
  board: [
    {
      line1: '오늘 학교에서 무슨 일 있었어?',
      line2: '당신의 이야기를 들려주세요!',
    },
    {
      line1: '고민은 나누면 반!',
      line2: '자유게시판에 이야기해 볼까요?',
    },
    {
      line1: '나만 아는 꿀팁이 있다면?',
      line2: '지금 글 쓰고 팁 공유하기!',
    },
    {
      line1: '궁금한 질문이 있다면',
      line2: '머뭇거리지 말고 물어보세요.',
    },
  ],
  message: [
    {
      line1: '오늘 하루 고생한 친구에게',
      line2: '따뜻한 응원 한마디 💌',
    },
    {
      line1: '서로를 존중하는 말 한마디가',
      line2: '더 좋은 대화를 만들어요.',
    },
  ],
  school: [
    {
      line1: '오늘 급식 메뉴 확인했나요?',
      line2: '맛있는 식사시간 보내세요! 🍱',
    },
    {
      line1: '즐거운 우리 학교 생활,',
      line2: '오늘도 파이팅!',
    },
  ],
  timer: [
    {
      line1: '지금 흘린 땀방울은',
      line2: '절대 거짓말을 하지 않아요.',
    },
    {
      line1: '조금만 더 힘내세요!',
      line2: '목표가 머지않았습니다 🔥',
    },
    {
      line1: '쉬어가는 것도 공부의 일부!',
      line2: '잠시 스트레칭해 보세요.',
    },
    {
      line1: '스마트폰은 잠시 멀리,',
      line2: '오직 나의 목표에 집중할 시간!',
    },
  ],
};

/** @type {BannerCopy[]} */
export const BANNER_COPY_COMMON = [
  {
    line1: 'Youth Paper와 함께',
    line2: '더 스마트해지는 학교 생활!',
  },
];

/**
 * @param {BannerPlacement | null | undefined} placement
 * @returns {number[]}
 */
export function getBannerPool(placement) {
  const dedicated = placement ? BANNER_PLACEMENT_ASSETS[placement] : null;
  if (dedicated != null) {
    return [dedicated, ...BANNER_ALL_ASSETS];
  }
  return [...BANNER_ALL_ASSETS];
}

/**
 * 화면별 멘트는 서로 섞지 않는다.
 * placement 있으면 해당 화면 멘트만, 없으면 공통 브랜딩만.
 * @param {BannerPlacement | null | undefined} placement
 * @returns {BannerCopy[]}
 */
export function getBannerCopyPool(placement) {
  if (placement && BANNER_COPY_BY_PLACEMENT[placement]) {
    return BANNER_COPY_BY_PLACEMENT[placement];
  }
  return BANNER_COPY_COMMON;
}

/**
 * @template T
 * @param {T[]} list
 * @returns {T}
 */
function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * @param {BannerPlacement | null | undefined} placement
 * @returns {{ source: number, copy: BannerCopy }}
 */
export function pickBanner(placement) {
  return {
    source: pickOne(getBannerPool(placement)),
    copy: pickOne(getBannerCopyPool(placement)),
  };
}

/** @deprecated use pickBanner */
export function pickBannerAsset(placement) {
  return pickBanner(placement).source;
}

/**
 * 타이머 배너 우선순위
 * 1. 앱에 직접 요청한 기업 광고 (미도입)
 * 2. 공지 — API 광고가 있으면 게시 후 3일, 없으면 7일
 * 3. 애드몹·API 광고 (미도입)
 * 4. 타이머 기본 에셋
 *
 * @param {Array<{ id?: number, title?: string, publishedAt?: string }> | null | undefined} items
 * @param {{ hasApiAd?: boolean, now?: number }} [options]
 */
export function pickActiveNoticeForBanner(items, { hasApiAd = false, now = Date.now() } = {}) {
  const days = hasApiAd ? NOTICE_BANNER_DAYS_WITH_API_AD : NOTICE_BANNER_DAYS;
  const windowMs = days * 24 * 60 * 60 * 1000;
  const list = Array.isArray(items) ? items : [];
  for (const item of list) {
    const title = String(item?.title ?? '').trim();
    const published = new Date(item?.publishedAt).getTime();
    if (!title || !Number.isFinite(published)) continue;
    if (now >= published && now - published <= windowMs) {
      return {
        id: item.id,
        title,
        source: NOTICE_BANNER_ASSET,
        copy: {
          line1: NOTICE_BANNER_LINE1,
          line2: title,
        },
      };
    }
  }
  return null;
}
