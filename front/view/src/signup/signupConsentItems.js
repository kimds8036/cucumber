/** @typedef {'kakao'|'apple'|'phone'} SignupProvider */

/**
 * @typedef {Object} ConsentItemDef
 * @property {string} key
 * @property {boolean} required
 * @property {string} label
 * @property {'terms'|'privacy'|null} detail
 */

export const DEFAULT_CONSENT_ITEMS = [
  {
    key: 'termsOfService',
    required: true,
    label: '서비스 이용약관 동의',
    detail: 'terms',
  },
  {
    key: 'dataCollection',
    required: true,
    label: '회원가입 및 서비스 제공을 위한 개인정보 수집·이용',
    detail: 'privacy',
  },
  {
    key: 'studentOcr',
    required: true,
    label: '학생증 인증용 개인정보 수집·이용',
    detail: 'privacy',
  },
  {
    key: 'location',
    required: true,
    label: '위치 정보 수집·이용',
    detail: null,
  },
  {
    key: 'marketingOptIn',
    required: false,
    label: '마케팅·이벤트 정보 수신',
    detail: null,
  },
];

export const REQUIRED_CONSENT_KEYS = DEFAULT_CONSENT_ITEMS.filter(
  (item) => item.required,
).map((item) => item.key);

export const ALL_CONSENT_KEYS = DEFAULT_CONSENT_ITEMS.map((item) => item.key);

/** @param {SignupProvider} provider */
export function getConsentItemsForProvider(provider) {
  if (__DEV__ && provider) {
    // analytics / logging hook
  }
  return DEFAULT_CONSENT_ITEMS;
}

export function createEmptyConsents() {
  return ALL_CONSENT_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});
}

export function areRequiredConsentsChecked(consents) {
  return REQUIRED_CONSENT_KEYS.every((key) => consents[key] === true);
}
