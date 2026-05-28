import { Alert } from 'react-native';

export const SUPPORT_EMAIL = 'support@youthpaper.app';

export const COMING_SOON_AUTH_FEATURE_MESSAGE =
  '아이디/비밀번호 찾기 기능은 정식 출시 후 제공될 예정입니다. 고객센터(이메일)로 문의해 주세요.';

export function showComingSoonAuthFeatureAlert() {
  Alert.alert('안내', `${COMING_SOON_AUTH_FEATURE_MESSAGE}\n\n${SUPPORT_EMAIL}`, [
    { text: '확인' },
  ]);
}

export const UNDER_14_BLOCK_MESSAGE =
  '만 14세 미만 회원의 경우, 관련 법령에 따라 법정대리인(보호자)의 동의 절차가 필요합니다. 현재 보호자 동의 인증 시스템(PASS)을 준비 중입니다. 보다 안전하고 원활한 서비스 제공을 위해 추후 업데이트를 통해 도입될 예정이오니 양해 부탁드립니다.';

export function showUnder14BlockAlert(onConfirm) {
  Alert.alert('안내 (Youth Paper)', UNDER_14_BLOCK_MESSAGE, [
    { text: '확인', onPress: onConfirm },
  ]);
}
