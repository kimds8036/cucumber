import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';

/**
 * 광고 API 호출 (플레이스홀더 — 추후 실제 SDK/엔드포인트로 교체)
 * @returns {Promise<Array>}
 */
export async function fetchAds() {
  try {
    const response = await api.get('/api/ads');
    const payload = response.data?.data ?? response.data ?? {};
    const ads = Array.isArray(payload.ads)
      ? payload.ads
      : Array.isArray(payload)
        ? payload
        : [];
    return ads.filter((ad) => ad != null);
  } catch (error) {
    console.warn('[useAdSlots] fetchAds failed:', error?.message || error);
    return [];
  }
}

/**
 * 목록 데이터에 광고 슬롯 삽입 (adSlots를 순서대로 소진)
 * @param {Array} items
 * @param {Array} adSlots
 * @param {object} [options]
 * @param {string} [options.adType='ad']
 * @param {string} [options.idPrefix='ad']
 * @param {number} [options.every=5]
 * @param {boolean} [options.skipFirstIndex=true] — index !== 0 조건
 * @param {function} [options.wrapItem] — (item, index) => wrapped item
 */
export function injectAdSlots(items, adSlots, options = {}) {
  const {
    adType = 'ad',
    idPrefix = 'ad',
    every = 5,
    skipFirstIndex = true,
    allowEmptySlots = true,
    wrapItem = (item) => item,
  } = options;

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const slots = Array.isArray(adSlots) ? adSlots : [];
  let adIndex = 0;
  const next = [];

  items.forEach((item, index) => {
    next.push(wrapItem(item, index));

    const atInterval = (index + 1) % every === 0;
    const passesSkip = !skipFirstIndex || index !== 0;

    if (atInterval && passesSkip) {
      if (slots.length === 0 && !allowEmptySlots) {
        return;
      }

      const adData =
        slots.length > 0 && adIndex < slots.length ? slots[adIndex] : null;
      next.push({
        id: `${idPrefix}_${index}`,
        type: adType,
        adData,
      });
      if (slots.length > 0 && adIndex < slots.length) {
        adIndex += 1;
      }
    }
  });

  return next;
}

/**
 * 컴포넌트 마운트 시 광고 슬롯 로드
 * @returns {{ adSlots: Array, loading: boolean, error: Error|null, refetch: function }}
 */
export function useAdSlots() {
  const [adSlots, setAdSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ads = await fetchAds();
      setAdSlots(ads);
    } catch (err) {
      setError(err);
      setAdSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { adSlots, loading, error, refetch };
}
