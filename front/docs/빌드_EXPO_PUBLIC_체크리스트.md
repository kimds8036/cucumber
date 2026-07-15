# 빌드 EXPO_PUBLIC 체크리스트 (스토어 AAB)

> Git 추적본. 로컬 운영 메모는 `docs/워크플로.md` · `docs/임시_테스트_및_원복_가이드.md` 와 함께 본다.  
> **사고 (2026-07-16):** `android:aab:prod`에 `EXPO_PUBLIC_INICIS_ENABLED=true`가 빠져 스토어 빌드에서 「테스트 mock」 본인인증이 나감.

## 핵심

`EXPO_PUBLIC_*` 는 **빌드 시 JS 번들에 인라인**된다.  
Railway env만 바꿔서는 **이미 빌드된 AAB**의 mock/실연동이 바뀌지 않는다. **스크립트·eas.json·`.env.production`에 넣고 AAB를 다시 빌드**해야 한다.

| 증상 | 보통 원인 |
|------|-----------|
| 「본인인증이 완료되었습니다. **(테스트 mock)**」 | 앱 `EXPO_PUBLIC_INICIS_ENABLED` ≠ `true` |
| 「본인인증 서버에 연결할 수 없습니다」 | 앱 ON + Railway `INICIS_ENABLED` ≠ `true` (또는 status API 실패) |
| 가입 단계 스킵·이니시스 안 열림 | `__DEV__` + `SIGNUP_TEST_MODE` (명시 `true`만, 또는 예전 기본 ON) |

## 스크립트별 필수 플래그

| npm script | `SIGNUP_TEST_MODE` | `ADULT_TEST_MODE` | `INICIS_ENABLED` |
|------------|--------------------|-------------------|------------------|
| `android:device:dev` | false | **true** (팀 테스트) | **true** |
| `android:device:prod` | false | **true** (팀 테스트) | **true** |
| `android:aab:prod` | false | **false** | **true** ← 누락 금지 |
| `android:bundle-prod` | false | false | **true** |
| `ios` / `ios:prod` | false | true(팀) | **true** |
| EAS `production` | false | false | true |

가드: `front/scripts/gradle-bundle-release.mjs` — AAB 시작 전 INICIS≠true / SIGNUP_TEST=true / ADULT_TEST=true 이면 **빌드 실패**.

## AAB 전 체크리스트

### 프론트 (번들)

- [ ] `package.json` `android:aab:prod`에 `EXPO_PUBLIC_INICIS_ENABLED=true`
- [ ] `EXPO_PUBLIC_SIGNUP_TEST_MODE=false`
- [ ] `EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=false` (스토어)
- [ ] `eas.json` production env 동일
- [ ] (권장) `front/.env.production` 에도 동일 값 (gitignore)
- [ ] `npm run env:print:prod` — production Railway URL
- [ ] AAB 로그에 `[aab] EXPO_PUBLIC_INICIS_ENABLED= true` 확인

### 백엔드 (Railway production)

- [ ] `INICIS_ENABLED=true`
- [ ] MID / KEY / IV / PUBLIC_BASE 등 운영값
- [ ] (권장) 가입 직후 `/api/auth/inicis/status` → `enabled: true`

### iOS 강제 업데이트 (혼동 방지)

- [ ] Android: `MIN_ANDROID_VERSION` / `ANDROID_STORE_URL`
- [ ] iOS: **`MIN_IOS_VERSION`** / `IOS_STORE_URL` (Android MIN만 올려도 iOS는 안 막힘)

## 수정 시 규칙

`front/package.json`의 android/ios 빌드 스크립트를 바꿀 때:

1. **device\*** 와 **aab/bundle\*** 에 같은 `EXPO_PUBLIC_INICIS_*` / signup 플래그가 있는지 한 줄씩 비교
2. 스토어용만 `ADULT_TEST_MODE=false`
3. `gradle-bundle-release.mjs` 가드가 깨지지 않는지 확인
4. 이 문서 · `docs/워크플로.md` § 빌드 EXPO_PUBLIC 절 갱신
