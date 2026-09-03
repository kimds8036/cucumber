import { Alert } from 'react-native';
import {
  getTooOldAlertMessage,
  getTooYoungAlertMessage,
} from './signupBirthDatePolicy';

export const SUPPORT_EMAIL = 'support@youthpaper.app';

/** 가입 연령·학적 예외 — 수동 검토 요청 */
export const SIGNUP_SUPPORT_EMAIL = 'team.ucost@gmail.com';

export const COMING_SOON_AUTH_FEATURE_MESSAGE =
  '아이디/비밀번호 찾기 기능은 정식 출시 후 제공될 예정입니다. 고객센터(이메일)로 문의해 주세요.';

export function showComingSoonAuthFeatureAlert() {
  Alert.alert('안내', `${COMING_SOON_AUTH_FEATURE_MESSAGE}\n\n${SUPPORT_EMAIL}`, [
    { text: '확인' },
  ]);
}

export const UNDER_14_BLOCK_MESSAGE =
  '만 14세 미만 회원은 관련 법령에 따라 법정대리인(보호자)의 본인인증 및 동의가 필요합니다. 보호자 명의 휴대전화로 본인인증을 완료해 주세요.';

const SIGNUP_MANUAL_REVIEW_SUFFIX = `\n\n다음 단계로 진행되지 않는 경우 ${SIGNUP_SUPPORT_EMAIL} 으로 연락해 주시면 신속히 검토 후 계정 생성을 도와드리겠습니다.`;

/** @deprecated 가입 플로우는 Sign.jsx C→보호자 인증 경로를 사용. 잔여 호출부용. */
export function showUnder14BlockAlert(onConfirm) {
  Alert.alert(
    '안내 (Youth Paper)',
    UNDER_14_BLOCK_MESSAGE + SIGNUP_MANUAL_REVIEW_SUFFIX,
    [{ text: '확인', onPress: onConfirm }],
  );
}

export const INELIGIBLE_AGE_MESSAGE =
  'Youth Paper는 중·고등학생을 위한 서비스입니다. 입력하신 생년월일 기준으로 가입할 수 없습니다.';

export function showIneligibleAgeAlert(onConfirm) {
  Alert.alert(
    '안내 (Youth Paper)',
    INELIGIBLE_AGE_MESSAGE + SIGNUP_MANUAL_REVIEW_SUFFIX,
    [{ text: '확인', onPress: onConfirm }],
  );
}

/** A 케이스 — 가입 가능 최소 생년월일 미만 */
export function showTooOldForSignupAlert(onConfirm, ref = new Date()) {
  Alert.alert('이용 연령 안내', getTooOldAlertMessage(ref), [
    { text: '돌아가기', onPress: onConfirm },
  ]);
}

/** D 케이스 — 가입 가능 최대 생년월일 초과 */
export function showTooYoungForSignupAlert(onConfirm, ref = new Date()) {
  Alert.alert('이용 연령 안내', getTooYoungAlertMessage(ref), [
    { text: '돌아가기', onPress: onConfirm },
  ]);
}

/** 보호자 본인인증 실패·거부 시 가입 중단 */
export function showGuardianVerificationFailedAlert(onConfirm) {
  Alert.alert(
    '보호자 인증 미완료',
    '보호자 본인인증이 완료되지 않아 가입을 진행할 수 없어요.',
    [{ text: '돌아가기', onPress: onConfirm }],
  );
}

/** 학교 선택 — 생년월일 기준 학년 안내 */
export const GRADE_ENROLLMENT_NOTICE =
  '학년은 본인인증 생년월일 기준으로 자동 입력되며, 다르면 수정할 수 있어요.';

export const GRADE_MISMATCH_HELP_TITLE = '학년이 다른 경우';

export const GRADE_MISMATCH_HELP_MESSAGE =
  '학년은 본인인증 생년월일 기준으로 자동 계산되어 가입 중에는 바꿀 수 없어요.\n\n가입을 마친 뒤 앱(마이페이지)의 「문의하기」로 학적 변동을 요청해 주시면, 확인 후 반영해 드릴게요.';
