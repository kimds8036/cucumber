import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { fetchAdsGrouped } from '../utils/adsApiAdapter';
import {
  emptyAdsGrouped,
  getAdFallbackPolicy,
  getAdInjectEvery,
} from '../constants/adPlacements';

let sharedGrouped = emptyAdsGrouped();
let sharedLoading = false;
let sharedFetched = false;
let sharedError = null;
let inflight = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore */
    }
  });
}

async function loadAdsGrouped(force = false) {
  if (!force && inflight) return inflight;
  if (!force && sharedFetched && !inflight) {
    return sharedGrouped;
  }

  sharedLoading = true;
  sharedError = null;
  notifyListeners();

  inflight = (async () => {
    try {
      const grouped = await fetchAdsGrouped(api);
      sharedGrouped = grouped ?? emptyAdsGrouped();
      sharedError = null;
      sharedFetched = true;
      return sharedGrouped;
    } catch (err) {
      sharedError = err;
      sharedGrouped = emptyAdsGrouped();
      sharedFetched = true;
      return sharedGrouped;
    } finally {
      sharedLoading = false;
      inflight = null;
      notifyListeners();
    }
  })();

  return inflight;
}

/** 스플래시 등에서 이미 fetch한 결과를 공유 캐시에 반영 */
export function primeAdsGrouped(grouped) {
  sharedGrouped = grouped ?? emptyAdsGrouped();
  sharedFetched = true;
  sharedLoading = false;
  sharedError = null;
  inflight = null;
  notifyListeners();
}

/**
 * 목록 데이터에 광고 슬롯 삽입 (adSlots를 순서대로 소진)
 */
export function injectAdSlots(items, adSlots, options = {}) {
  const {
    placement,
    adType = 'ad',
    idPrefix = 'ad',
    skipFirstIndex = true,
    wrapItem = (item) => item,
  } = options;

  const policy = placement ? getAdFallbackPolicy(placement) : 'tip';
  const every =
    options.every ?? (placement ? getAdInjectEvery(placement) : 5);
  const allowEmptySlots =
    options.allowEmptySlots ?? policy === 'tip';

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
        placement: placement ?? null,
      });
      if (slots.length > 0 && adIndex < slots.length) {
        adIndex += 1;
      }
    }
  });

  return next;
}

/**
 * @param {string} [placement] — 지정 시 해당 placement 배열만 adSlots로 반환
 */
export function useAdSlots(placement) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    loadAdsGrouped(false);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refetch = useCallback(() => loadAdsGrouped(true), []);

  const adSlots = placement
    ? (sharedGrouped?.[placement] ?? [])
    : Object.values(sharedGrouped ?? {}).flat();

  return {
    adSlots,
    grouped: sharedGrouped,
    loading: sharedLoading,
    error: sharedError,
    refetch,
  };
}
