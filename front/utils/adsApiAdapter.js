// front/utils/adsApiAdapter.js
//
// 목적: 백엔드 /api/ads 응답 스펙이 아직 정해지지 않은 상태에서도
// 나머지 코드(useAdSlots, 각 화면)가 백엔드 변경에 영향받지 않게 격리한다.
//
// 원칙:
// - 이 파일을 거치지 않고 어디서도 raw ads response를 직접 파싱하지 않는다.
// - 백엔드 스펙이 실제로 정해지면, normalizeItem / extractRawList 만 고치면 된다.
// - 알 수 없는/예상과 다른 shape가 오면 조용히 무시하지 말고 개발 중 경고를 남긴다.

import {
  emptyAdsGrouped,
  isKnownAdPlacement,
} from '../constants/adPlacements';

function extractRawList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.ads)) return response.data.ads;
  if (Array.isArray(response?.ads)) return response.ads;

  // placement 키로 이미 그룹핑된 객체
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const nested = response.data && typeof response.data === 'object'
      ? response.data
      : response;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const values = Object.values(nested);
      if (
        values.length > 0 &&
        values.every((v) => Array.isArray(v) || v == null)
      ) {
        return null; // grouped shape → normalizeAdsResponse에서 별도 처리
      }
    }
  }
  return null;
}

function extractGroupedObject(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return null;
  }
  const candidate =
    response.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : response;
  if (Array.isArray(candidate?.ads) || Array.isArray(candidate)) return null;

  const keys = Object.keys(candidate).filter((k) => isKnownAdPlacement(k));
  if (keys.length === 0) return null;
  return candidate;
}

function normalizeItem(raw) {
  return {
    id: raw?.id ?? raw?._id ?? String(Math.random()),
    title: raw?.title ?? raw?.label ?? raw?.sponsor ?? raw?.author ?? '',
    body: raw?.body ?? raw?.content ?? '',
    imageUrl: raw?.imageUrl ?? raw?.image ?? null,
    ctaUrl: raw?.ctaUrl ?? raw?.url ?? raw?.link ?? null,
    subtitle: raw?.subtitle ?? raw?.subTitle ?? raw?.description ?? '',
    placement: raw?.placement ?? raw?.slot ?? raw?.type ?? null,
    // 하위 호환: 기존 placeholder가 sponsor/content를 읽을 수 있게 미러
    sponsor: raw?.sponsor ?? raw?.author ?? raw?.title ?? null,
    author: raw?.author ?? raw?.sponsor ?? null,
    content: raw?.content ?? raw?.body ?? null,
    label: raw?.label ?? raw?.title ?? null,
  };
}

export function normalizeAdsResponse(response) {
  const grouped = emptyAdsGrouped();

  const asGrouped = extractGroupedObject(response);
  if (asGrouped) {
    for (const [placement, list] of Object.entries(asGrouped)) {
      if (!isKnownAdPlacement(placement)) {
        if (__DEV__) {
          console.warn(
            '[adsApiAdapter] placement 없는/알 수 없는 광고 키 무시:',
            placement,
          );
        }
        continue;
      }
      const arr = Array.isArray(list) ? list : [];
      grouped[placement] = arr
        .filter((raw) => raw != null)
        .map((raw) => ({ ...normalizeItem(raw), placement }));
    }
    return grouped;
  }

  const rawList = extractRawList(response);

  if (rawList === null) {
    if (__DEV__) {
      console.warn(
        '[adsApiAdapter] 알 수 없는 /api/ads 응답 shape. normalizeItem/extractRawList를 실제 스펙에 맞게 수정하세요.',
        response,
      );
    }
    return grouped;
  }

  for (const raw of rawList) {
    const item = normalizeItem(raw);

    if (!item.placement || !isKnownAdPlacement(item.placement)) {
      if (__DEV__) {
        console.warn(
          '[adsApiAdapter] placement 없는/알 수 없는 광고 데이터 무시:',
          raw,
        );
      }
      continue;
    }

    grouped[item.placement].push(item);
  }

  return grouped;
}

/** useAdSlots 등에서 이 함수만 호출한다. raw 파싱은 여기서만. */
export async function fetchAdsGrouped(apiClient) {
  try {
    const response = await apiClient.get('/api/ads');
    return normalizeAdsResponse(response.data);
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[adsApiAdapter] /api/ads 요청 실패, 빈 값으로 처리:',
        err?.message,
      );
    }
    return emptyAdsGrouped();
  }
}
