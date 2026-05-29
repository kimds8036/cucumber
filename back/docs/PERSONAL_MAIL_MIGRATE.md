# personal_mails 마이그레이션 (develop / production Railway)

## 적용 내용 (`004_personal_mails_status.sql`)

- `status` ENUM(`sent`, `read`, `returned`) — `is_read` 제거
- 수신인 스냅샷: `recipient_school_id`, `recipient_grade`, `recipient_class_num`, `recipient_name`, `recipient_user_id`
- `is_match_failed`, `sent_at`, `returned_at`
- `recipient_id` NULL 허용 (매칭 실패 우편)

서버 기동 시 `ensurePersonalMailSchema()` 도 동일 변경을 멱등 적용합니다.

## Railway MySQL — develop

1. Railway 대시보드 → **cucumber-develop** → MySQL/Variables에서 접속 정보 확인
2. 로컬에서 `back/.env` (또는 일회성 env)에 develop DB 설정

```powershell
cd C:\y\back
# .env 예: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (develop DB)
npm run migrate
```

## Railway MySQL — production

동일하게 **cucumber-production** DB 변수로 `npm run migrate` 실행.

Play AAB·`MIN_ANDROID_VERSION` 배포 **전후**는 `푸쉬규칙.md` 순서를 따릅니다.

## 환경 변수 (선택)

| 변수 | 기본 | 설명 |
|------|------|------|
| `PERSONAL_MAIL_RETURN_DAYS` | `1` | 반송까지 일수 |
| `CRON_PERSONAL_MAIL_RETURN` | `0 4 * * *` | 반송 배치 (KST) |

## API (프론트 연동)

| 메서드 | 경로 |
|--------|------|
| POST | `/api/mails/personal/send` |
| GET | `/api/mails/personal/:mailId/retry` |

동명이인: HTTP 409, `code: "DUPLICATE_RECIPIENT"`, `status: "DUPLICATE"`
