/** back/src/utils/validation.js 와 동일 규칙 */

export const USERNAME_HINT = '영문·숫자·_(밑줄) 3~20자';
export const PASSWORD_HINT = '8자 이상, 영문·숫자 각 1자 이상 (@$!%*#?& 가능)';
export const USERNAME_ERROR =
  '아이디는 영문, 숫자, 언더스코어(_)만 사용 가능하며 3~20자여야 합니다.';
export const PASSWORD_ERROR =
  '비밀번호는 영문과 숫자를 포함하여 최소 8자 이상이어야 합니다.';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

export function isValidUsername(value) {
  return USERNAME_RE.test(String(value || '').trim());
}

export function isValidPassword(value) {
  return PASSWORD_RE.test(String(value || ''));
}
