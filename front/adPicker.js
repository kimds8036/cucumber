// front/utils/adPicker.js
//
// top_banner처럼 한 placement에 광고가 여러 개 있을 수 있는 경우,
// 화면(위치)이 마운트될 때마다 풀에서 하나를 뽑아 쓰기 위한 유틸.
//
// 순수 랜덤(Math.random)은 풀이 클수록 "특정 광고가 계속 안 뽑히는" 문제가 생긴다
// (예: 광고 40개 중 노출 자리는 4곳뿐이면, 몇몇 광고는 운 나쁘면 한 번도 안 뽑힐 수 있음).
// 그래서 "셔플백(shuffle bag)" 방식을 쓴다:
//   1) 풀을 한 번 무작위로 섞어서 큐를 만든다
//   2) 뽑을 때마다 큐에서 하나씩 꺼내 쓰고 제거한다
//   3) 큐가 바닥나면(=풀 전체가 한 바퀴 돌았으면) 다시 섞어서 새 큐를 만든다
// → 풀 크기만큼 뽑는 동안 모든 광고가 정확히 한 번씩 노출되는 게 보장되면서도,
//   순서는 매번 섞이므로 사용자 입장에서는 랜덤처럼 느껴진다.
//
// 전제: adsApiAdapter.normalizeAdsResponse()를 거친 `grouped` 형태
//       { [placement]: AdItem[] } 를 입력으로 받는다.

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// placement별 현재 큐 상태를 앱 실행 중(in-memory)에만 유지.
// 앱을 껐다 켜면 초기화되므로, 세션을 넘어서도 공평한 노출을 보장하고 싶다면
// 이 state를 AsyncStorage에 저장/복원하는 걸 고려할 것.
const rotationState = {};

export function pickAdForPlacement(grouped, placement) {
  const pool = grouped?.[placement];

  if (!pool || pool.length === 0) {
    return null; // 풀이 비어있으면 null → 각 슬롯의 폴백 정책(hide/tip)으로 넘어감
  }

  let state = rotationState[placement];

  // 처음 호출되었거나, 풀 크기가 바뀌었으면(새 광고 추가/제거) 큐를 새로 만든다
  if (!state || state.poolSize !== pool.length) {
    state = { queue: shuffle(pool), poolSize: pool.length };
    rotationState[placement] = state;
  }

  // 큐가 비었으면(한 바퀴 다 돌았으면) 다시 섞어서 리필
  if (state.queue.length === 0) {
    state.queue = shuffle(pool);
  }

  return state.queue.pop();
}

/* 사용 예시 (TopAdBanner를 쓰는 각 화면에서)

import { pickAdForPlacement } from '../adPicker';
// TODO: /api/ads → useAdSlots / fetchAdsGrouped 로 grouped 공급

function useTopBannerAd(grouped) {
  const ad = pickAdForPlacement(grouped, 'top_banner');
  return ad; // null이면 TopAdBanner 쪽에서 Tip 렌더
}
*/
