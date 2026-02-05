# 백엔드 API 스펙 (로그인 / 회원가입)

> `src/index.js`, `src/routes/auth.js` 기준으로 정리

---

## 베이스 URL

- **로컬**: `http://localhost:3000` (환경변수 `PORT` 없으면 3000)
- **실제 기기**: `http://{PC_IP}:3000` (예: `http://192.168.0.10:3000`)
- **Android 에뮬레이터**: `http://10.0.2.2:3000`

---

## 로그인

- **URL**: `POST /api/auth/login`
- **전체 주소 예**: `http://localhost:3000/api/auth/login`

**요청 body (JSON)**

| 필드       | 타입   | 필수 | 설명        |
|-----------|--------|------|-------------|
| username  | string | O    | 사용자명(아이디) |
| password  | string | O    | 비밀번호      |
| deviceId  | string | X    | 디바이스 ID   |

**성공 (200)**

```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "token": "JWT_문자열",
    "user": {
      "id": 1,
      "username": "아이디",
      "name": "이름"
    },
    "needsVerification": false
  }
}
```

**실패 (400/401)**  
- `success: false`, `message`: 에러 메시지

---

## 전화번호 인증 코드 발송

- **URL**: `POST /api/auth/send-verification`
- **요청 body**: `{ "phone": "01012345678" }`
- **성공**: `{ "success": true, "message": "인증 코드가 발송되었습니다." }`  
  - 개발 환경에서는 `verificationCode` 값도 내려줌

---

## 전화번호 인증 코드 확인

- **URL**: `POST /api/auth/verify-phone`
- **요청 body**: `{ "phone": "01012345678", "verificationCode": "123456" }`
- **성공**: `{ "success": true, "message": "전화번호 인증이 완료되었습니다." }`

---

## 회원가입

- **URL**: `POST /api/auth/signup`
- **전체 주소 예**: `http://localhost:3000/api/auth/signup`

**요청 body (JSON)** – 모두 필수

| 필드          | 타입   | 설명        |
|---------------|--------|-------------|
| username      | string | 사용자명(아이디) |
| password      | string | 비밀번호      |
| name          | string | 이름         |
| phone         | string | 전화번호 (인증 완료된 번호) |
| birthDate     | string | 생년월일 (YYYY-MM-DD 등 백엔드 형식) |
| schoolId      | number | 학교 ID      |
| grade         | number/string | 학년   |
| classNumber   | number/string | 반    |
| graduationYear| number/string | 졸업 예정 연도 |
| colorId       | number | 컬러 ID (colors 테이블) |

**성공 (201)**

```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": { "userId": 1 }
}
```

**참고**: 전화번호는 반드시 `send-verification` → `verify-phone` 완료 후에 사용해야 함.

---

## 인증이 필요한 API

헤더에 토큰 포함:

```
Authorization: Bearer {JWT_TOKEN}
```

- `POST /api/auth/logout` – 로그아웃
- `POST /api/auth/verify-student` – 학생 인증
- `POST /api/auth/ocr` – OCR 학생증 인증
