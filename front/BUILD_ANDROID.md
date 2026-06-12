# Android 빌드 가이드 (develop / production)

앱은 **빌드할 때 박히는 API URL**로 Railway·DB가 결정됩니다.  
브랜치 이름만으로 바뀌지 않고, **`APP_ENV`** 와 **실행한 npm 스크립트**가 중요합니다.

| 목표                  | Git 브랜치       | Railway·DB | npm 스크립트         |
| --------------------- | ---------------- | ---------- | -------------------- |
| 폰에 직접 설치·테스트 | **`develop`**    | develop    | `android:device:dev` |
| Play용 AAB            | **`production`** | production | `android:aab:prod`   |

---

## 공통 준비 (최초·의존성 변경 시)

```powershell
cd C:\y\front
npm install
```

release AAB 서명용 `credentials.json`이 없으면:

```powershell
npm run credentials:android
```

`front/credentials.json` (gitignore)

---

## 1. Develop — 폰에 직접 설치 (develop Railway + DB)

### 브랜치

```powershell
cd C:\\y
git checkout develop
git pull origin develop
```

### 빌드·설치 (한 번에)

USB 디버깅 켠 뒤:

```powershell
cd C:\y\front
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run android:device:dev
```

내부 순서:

1. `clean:android` — `android/`, `.expo`, 캐시 삭제
2. `prebuild:android:dev` — `APP_ENV=development` + `--clean`
3. `expo run:android` — 기기에 설치·실행

### URL 확인 (빌드 전·후)

```powershell
npm run env:print:dev
```

기대값: `apiBaseUrl` → `https://cucumber-develop.up.railway.app`

### 수동으로 나눌 때

```powershell
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run clean:android
npm run prebuild:android:dev
npm run env:print:dev
npx cross-env APP_ENV=development expo run:android
```

---

## 2. Production — Play용 AAB (production Railway + DB)

### 브랜치

```powershell
cd C:\\y
git checkout production
git pull origin production
```

### AAB 빌드 (권장)

```powershell
cd C:\y\front
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run android:aab:prod
```

내부 순서:

1. `clean:android`
2. `prebuild:android:prod` — `APP_ENV=production` + `--clean`
3. `env:print:prod` — production URL 아니면 **실패**
4. `gradle-bundle-release.mjs` — `APP_ENV`·`NODE_ENV=production` 유지하며 `bundleRelease`

### 결과 파일

```text
front\android\app\build\outputs\bundle\release\app-release.aab
```

Play Console → App Bundle 업로드.

### R8 가독화(mapping) 파일 (Play Console 경고 대응)

release AAB는 `app.config.js`의 `expo-build-properties`로 **R8 난독화·리소스 축소**가 켜져 있습니다.  
`bundleRelease` 후 mapping 파일 경로:

```text
front\android\app\build\outputs\mapping\release\mapping.txt
```

Play Console → 해당 버전 → **App Bundle** → **가독화 파일 업로드**에 `mapping.txt`를 올리면 비정상 종료·ANR 분석이 쉬워집니다.  
(AAB와 **같은 빌드**에서 나온 파일만 유효합니다.)

### URL 확인

```powershell
npm run env:print:prod
```

기대값: `apiBaseUrl` → `https://cucumber-production.up.railway.app`

### 수동으로 나눌 때

```powershell
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run clean:android
npm run prebuild:android:prod
npm run env:print:prod
cross-env APP_ENV=production NODE_ENV=production node scripts/gradle-bundle-release.mjs
```

`gradlew clean`은 CMake 오류가 날 수 있어 **사용하지 않습니다.**

---

## 3. Production — 폰에 직접 설치 (스토어 올리기 전 검증)

```powershell
git checkout production
cd C:\y\front
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run android:device:prod
```

`env:print:prod`로 URL 확인 후, production DB에서만 있는 계정으로 로그인 테스트.

---

## npm 스크립트 요약

| 스크립트                | 용도                              |
| ----------------------- | --------------------------------- |
| `clean:android`         | android / .expo / Metro 캐시 삭제 |
| `env:print:dev`         | develop URL 검증                  |
| `env:print:prod`        | production URL 검증               |
| `prebuild:android:dev`  | develop prebuild만                |
| `prebuild:android:prod` | production prebuild만             |
| `android:device:dev`    | **develop** 폰 설치               |
| `android:device:prod`   | **production** 폰 설치            |
| `android:aab:prod`      | **production** AAB (Play)         |
| `android:aab-prod`      | `android:aab:prod` 와 동일 (별칭) |

---

## 자주 하는 실수

| 증상                                                        | 원인                                                           | 대처                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `exports is not defined in ES module scope` (app.config.js) | `app.config.js`에서 `@expo/env`를 ESM `import` 함              | 최신 코드는 제거됨 — `git pull` 후 재시도        |
| Play AAB가 develop DB                                       | AAB 시 `APP_ENV` 없이 `gradlew`만 실행, 예전 `android/` 재사용 | `npm run android:aab:prod` 사용 (`--clean` 포함) |
| 로컬은 prod, 스토어는 dev                                   | 폰 테스트는 `--clean` 했는데 AAB는 예전 스크립트               | 위 표대로 스크립트 통일                          |
| URL이 이상함                                                | `EXPO_PUBLIC_API_URL` 환경 변수가 develop을 가리킴             | 빌드 전 `Remove-Item Env:EXPO_PUBLIC_API_URL`    |

---

## Play 배포 순서 (production)

1. `production` 브랜치에서 `npm run android:aab:prod`
2. Play에 AAB 업로드
3. Railway production에 `MIN_ANDROID_VERSION` 등 설정
4. `git push origin production` (`WORKFLOW.md` 참고)

---

관련: `config/apiEnv.js`, `.env.development`, `.env.production`, `WORKFLOW.md`
