export const CHAT_MEMORY_LIMIT = 500;
export const CHAT_CACHE_TTL_MS = 5 * 60 * 1000;
export const CHAT_CACHE_SAVE_LIMIT = 200;
export const CHAT_INITIAL_FETCH_LIMIT = 30;
export const CHAT_PAGE_SIZE = 30;
/** 첫 화면 렌더 후 조용히 다음 페이지 요청까지 대기 (ms) — 짧을수록 빨리 prepend·앵커 보정 */
export const CHAT_SILENT_PREFETCH_DELAY_MS = 150;
/** 방 진입 후 백그라운드 프리페치·스크롤 안정화 최대 대기 (이후 오버레이 강제 해제) */
export const CHAT_INITIAL_SCROLL_SETTLE_MAX_MS = 3200;
/** 스크롤 페이징 시 스피너는 이 시간 넘겨도 로딩이면 표시 (미리 받아두면 대부분 안 보임) */
export const CHAT_LIST_SPINNER_DELAY_MS = 1200;
export const CHAT_POLL_INTERVAL = 10000;
export const CHAT_CACHE_SAVE_DEBOUNCE = 500;
export const CHAT_TEMP_REPLACE_DELAY = 5000;
