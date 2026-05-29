# FCM 토큰 정규화 (`036_fcm_tokens_multidevice_normalize.sql`)

## 변경 요약

- `fcm_tokens.device_id` 추가 — **(user_id, device_id)** 당 active 토큰 1개 (멀티 디바이스)
- 기존 row 정리: user+device별 최신 1개만 active
- `users.fcm_token` 백필 후 **컬럼 DROP**
- 로그아웃 시 해당 `device_id` / `token` 비활성화
- 알림 큐: DB·소켓·FCM 단계별 멱등 + `jobId` 중복 잡 방지

## Railway 적용

```powershell
cd C:\y\back
npm run migrate
```

develop / production DB **각각** 실행.

## 검증 SQL

```sql
SELECT user_id, device_id, COUNT(*) AS active_cnt
FROM fcm_tokens WHERE is_active = TRUE
GROUP BY user_id, device_id HAVING active_cnt > 1;

SELECT COUNT(*) FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fcm_token';
-- 기대: 0
```

## 앱

- `front/utils/deviceId.js` — 설치 ID
- FCM 업로드: `token`, `deviceId`, `deviceType`, `appVersion`
- 로그아웃: `deviceId`, `token` 전달
