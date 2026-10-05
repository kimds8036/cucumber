import { Platform } from 'react-native';

/** 구글이 공개한 샘플 앱 ID. 실제 앱 ID가 없을 때 네이티브 빌드가 깨지지 않게 쓴다. */
export const GOOGLE_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const GOOGLE_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const SAMPLE_UNITS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

/** 학생 앱 기본값. 맞춤 광고는 동의 흐름이 생기기 전까지 요청하지 않는다. */
export const AD_REQUEST_OPTIONS = {
  requestNonPersonalizedAdsOnly: true,
};

let ready = false;
let initPromise = null;

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function platformKey() {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

function resolveUnit(envName, sampleKey) {
  const fromEnv = readEnv(envName);
  if (fromEnv) return fromEnv;
  const key = platformKey();
  if (!key || !__DEV__) return '';
  return SAMPLE_UNITS[key][sampleKey];
}

/** 배너 단위 ID. 운영 빌드는 환경 변수가 있을 때만 반환한다. */
export function getBannerUnitId() {
  const envName =
    Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_ADMOB_BANNER_IOS'
      : 'EXPO_PUBLIC_ADMOB_BANNER_ANDROID';
  return resolveUnit(envName, 'banner');
}

/** 리워드 영상 단위 ID. 운영 빌드는 환경 변수가 있을 때만 반환한다. */
export function getRewardedUnitId() {
  const envName =
    Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_ADMOB_REWARDED_IOS'
      : 'EXPO_PUBLIC_ADMOB_REWARDED_ANDROID';
  return resolveUnit(envName, 'rewarded');
}

export function isAdMobReady() {
  return ready;
}

function hasPublisherAppId() {
  const envName =
    Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_ADMOB_IOS_APP_ID'
      : 'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID';
  return Boolean(readEnv(envName));
}

export function initAdMob() {
  if (ready) return Promise.resolve(true);
  if (initPromise) return initPromise;
  if (!platformKey()) return Promise.resolve(false);
  if (!__DEV__ && !hasPublisherAppId()) return Promise.resolve(false);

  initPromise = (async () => {
    try {
      const { default: mobileAds, MaxAdContentRating, AgeRestrictedTreatment } =
        require('react-native-google-mobile-ads');
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.T,
        ageRestrictedTreatment: AgeRestrictedTreatment.TEEN,
      });
      await mobileAds().initialize();
      ready = true;
      return true;
    } catch {
      ready = false;
      return false;
    }
  })();

  return initPromise;
}

/**
 * 리워드 영상을 재생하고, 보상을 받으면 true.
 * 네이티브 모듈이 없거나 단위 ID가 없으면 false.
 */
export function showRewardedAd() {
  const unitId = getRewardedUnitId();
  if (!unitId || !ready) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let earned = false;
    const unsubscribers = [];
    let timer = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          // ignore
        }
      });
      resolve(value);
    };

    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = require(
        'react-native-google-mobile-ads',
      );
      const ad = RewardedAd.createForAdRequest(unitId, AD_REQUEST_OPTIONS);
      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          ad.show().catch(() => finish(false));
        }),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned)),
        ad.addAdEventListener(AdEventType.ERROR, () => finish(false)),
      );
      timer = setTimeout(() => finish(false), 20000);
      ad.load();
    } catch {
      finish(false);
    }
  });
}
