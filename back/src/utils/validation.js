// 전화번호 형식 검증 (한국 형식)
export const validatePhone = (phone) => {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
};

// 사용자명 검증 (영문, 숫자, 언더스코어, 3-20자)
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// 비밀번호 검증 (최소 8자, 영문+숫자 조합)
export const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

// 생년월일 검증
export const validateBirthDate = (birthDate) => {
  const date = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  return age >= 13 && age <= 100; // 13세 이상 100세 이하
};
