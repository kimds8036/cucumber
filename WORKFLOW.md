# Youth Paper — 레포 작업·배포 워크플로

팀·에이전트가 동일한 흐름으로 개발·배포할 수 있도록 정리한 **단일 운영 문서**입니다.  
(구 `규칙.md`, `REPOSITORY_WORKFLOW.md`, `푸쉬규칙.md`, `브랜치작업.md` 통합)

---

## 목차

1. [핵심 원칙 (서버·DB 분리)](#1-핵심-원칙-서버db-분리)
2. [Railway 환경](#2-railway-환경)
3. [Git 브랜치 전략](#3-git-브랜치-전략)
4. [기능 브랜치 작업 (feat / fix)](#4-기능-브랜치-작업-feat--fix)
5. [develop → production 반영](#5-develop--production-반영)
6. [production push 시점](#6-production-push-시점)
7. [앱 버전](#7-앱-버전)
8. [로컬 테스트](#8-로컬-테스트)
9. [관련 경로·문서](#9-관련-경로문서)

---

## 1. 핵심 원칙 (서버·DB 분리)

| 구분 | develop | production |
|------|---------|------------|
| Git 브랜치 | `develop` | `production` |
| Railway 백엔드 | `cucumber-develop` | `cucumber-production` |
| DB / Redis | **develop 전용** 변수 | **production 전용** 변수 |
| 앱 빌드 | `APP_ENV=development` | `APP_ENV=production` |

**절대 하지 않는 것**

- develop 브랜치 빌드·설정으로 **production Railway·DB**에 붙이기
- production 브랜치 빌드·설정으로 **develop Railway·DB**에 붙이기  
  → 계정·신고·우편 등 **데이터가 섞입니다.**

**허용하는 것**

- develop에서 검증한 기능을 production 브랜치로 옮길 때 **체리픽** 또는 **`merge(develop)`** 모두 가능  
- 전제: production 브랜치에서 빌드·배포할 때 **항상 production URL·DB**를 쓰고, 스키마는 production DB에 **별도 migrate**

브랜치 이름이 아니라 **`APP_ENV` / `EXPO_PUBLIC_API_URL` / EAS 프로필**이 실제로 어느 서버를 가리키는지가 기준입니다.

---

## 2. Railway 환경

| 환경 | Railway 서비스 | API 베이스 URL | DB / Redis |
|------|----------------|----------------|------------|
| **Develop** | `cucumber-develop` | `https://cucumber-develop.up.railway.app` | develop 전용 변수 그룹 |
| **Production** | `cucumber-production` | `https://cucumber-production.up.railway.app` | production 전용 변수 그룹 |

프론트 설정: `front/config/apiEnv.js`, `front/eas.json`, `front/.env.development`, `front/.env.production`

### 강제 업데이트 (버전 체크)

백엔드 `GET /api/app/version-check`가 `MIN_*` 환경 변수를 읽습니다. **develop / production 서비스에 각각** 설정합니다.

| 변수 | Develop Railway (권장) | Production Railway |
|------|------------------------|-------------------|
| `MIN_ANDROID_VERSION` | `1.0.0` (팀 테스트 차단 방지) | 스토어 **최소 버전** — **AAB 반영 후에만** 올림 |
| `ANDROID_STORE_URL` | Play 링크 | Play 링크 |
| `NODE_ENV` | `production` 권장 | `production` |

**Production 순서:** Play에 새 AAB **먼저** → `MIN_ANDROID_VERSION` 올림 → `production` 브랜치 push (Railway 재배포).  
순서가 바뀌면 스토어에 없는 버전을 요구해 사용자가 막힐 수 있습니다.

구현: `back/src/routes/app.js`, `front/components/common/ForceUpdateGate.jsx`  
배포 전 점검: `DEPLOY_PREFLIGHT_CHECKLIST.md`

---

## 3. Git 브랜치 전략

| 브랜치 | 역할 |
|--------|------|
| **`develop`** | 통합·연동 테스트 (develop Railway + develop DB) |
| **`production`** | 스토어·운영 (production Railway + production DB) |
| **`feat/…` / `fix/…`** | 작업 단위 분기 → develop에 반영 후 삭제 |

`feat/front-init`, `feat/back-init` 같은 **장기 init 브랜치는 사용하지 않습니다.**

### 권장 흐름

1. `develop`에서 `feat/작업이름` 또는 `fix/작업이름` 분기 → 작업·push
2. **develop에 체리픽 또는 머지** 후 push → develop Railway 재배포
3. **DB 스키마 변경 시** develop·production **각각** `cd back && npm run migrate`
4. 스토어·운영 → **production에 체리픽 또는 merge(develop)** → AAB·Play 후 push ([§6](#6-production-push-시점))

### 주의

- 민감 파일(`.env`, `credentials.json`, 키스토어 등)은 **커밋하지 않습니다.** (`.gitignore` 준수)
- production 반영 전: `front/config/apiEnv.js`, `app.config.js`의 `extra.apiBaseUrl` / `appEnv`, `.env.production`의 `APP_ENV=production`이 **production URL**을 가리키는지 빌드 전 확인

---

## 4. 기능 브랜치 작업 (feat / fix)

`develop`에서 분기 → 작업 → **체리픽 또는 머지**로 develop에 합친 뒤 → 브랜치 삭제.

Android 빌드: `front/BUILD_ANDROID.md`

### 백엔드만 (예: 개인우편 API)

```powershell
git checkout develop
git pull origin develop
git checkout -b feat/personal-mail-send
# back/ 수정 …
git add back/
git commit -m "feat(back): 개인우편 send·반송·status 마이그레이션"
git push -u origin feat/personal-mail-send
# develop 체리픽 또는 머지 후 브랜치 삭제
# Railway develop DB → cd back && npm run migrate
```

### 4.1 작업 브랜치 만들기

```powershell
cd C:\y
git checkout develop
git pull origin develop

git checkout -b feat/mail-ui      # 프론트 예시
git checkout -b fix/comment-report # 백 예시
```

### 4.2 작업 · 커밋 · push

```powershell
git status
git add <파일 또는 경로>
git commit -m "feat(front): 우편 화면 개선"
git push -u origin feat/mail-ui
```

### 4.3 develop에 반영 — 체리픽 (커밋 단위가 깔끔할 때)

```powershell
git checkout develop
git pull origin develop

git log --oneline feat/mail-ui
git cherry-pick <커밋해시>

# 충돌 시: 파일 수정 후
git add .
git cherry-pick --continue
# 취소: git cherry-pick --abort

git push origin develop
```

**여러 커밋 한 번에:**

```powershell
git cherry-pick <시작해시>^..<끝해시>
```

### 4.4 develop에 반영 — 머지 (브랜치 전체를 한꺼번에)

```powershell
git checkout develop
git pull origin develop

git merge feat/mail-ui -m "merge(feat/mail-ui): develop에 반영"

git add .
git commit   # merge 커밋이 자동이면 생략

git push origin develop
```

| 방식 | 장점 | 단점 |
|------|------|------|
| **체리픽** | develop 히스토리 단순, production에도 같은 해시로 옮기기 쉬움 | 커밋마다 충돌 가능 |
| **머지** | 한 번에 합침 | merge 커밋 추가 |

### 4.5 작업 브랜치 삭제

develop push까지 끝난 뒤:

```powershell
git push origin --delete feat/mail-ui
git branch -d feat/mail-ui
git fetch origin --prune
```

### 4.6 develop에 다 들어갔는지 확인 (삭제 전)

```powershell
git fetch origin
git log --oneline origin/feat/mail-ui --not origin/develop
```

아무것도 안 나오면 삭제해도 됩니다.

```powershell
git merge-base --is-ancestor origin/feat/mail-ui origin/develop
echo $LASTEXITCODE   # 0 이면 포함됨
```

### 4.7 자주 쓰는 명령

```powershell
git branch --show-current
git checkout develop && git pull origin develop
git branch -a
git diff develop..feat/mail-ui --stat
git reset --hard HEAD~1   # cherry-pick 취소 (push 전)
```

### 4.8 주의

- 작업 브랜치는 **항상 `develop`에서 분기** (production에서 분기하지 않음)
- 충돌 시 **develop 쪽 최신 규칙**(버전 번호, `apiEnv`, 빌드 스크립트)을 우선하고, 작업 브랜치의 **기능 코드만** 살립니다

---

## 5. develop → production 반영

**목표:** develop에서 검증된 기능을 production 브랜치·production Railway·production DB에 반영.  
**전제:** §1 서버·DB 분리 — production 빌드는 항상 production URL·DB.

### 5-A. 체리픽 (커밋 단위, 히스토리 단순할 때)

```powershell
git checkout production
git pull origin production

git cherry-pick <develop에_넣은_해시>

# 로컬 커밋 후 AAB·Play 절차 → §6 참고
# git push origin production
```

### 5-B. 머지 (develop 전체를 한 번에 반영)

develop에서 충분히 검증했고, production에 **동일 스냅샷**을 맞출 때:

```powershell
git checkout production
git pull origin production

git merge develop -m "merge(develop): production에 반영"

# 충돌 해결 후
git add .
git commit

# production DB migrate, AAB·Play·MIN 버전 → §6
```

| 방식 | 언제 쓰나 |
|------|-----------|
| **체리픽** | 일부 기능만 운영에 올릴 때, 커밋 단위 추적이 중요할 때 |
| **merge(develop)** | develop과 production 코드베이스를 맞출 때 (서버·DB만 분리 유지) |

**머지·체리픽 공통 체크**

- [ ] production Railway에 `npm run migrate` 실행 (develop과 **별도** DB)
- [ ] `APP_ENV=production`, API URL = production Railway
- [ ] Play AAB 업로드 → `MIN_ANDROID_VERSION` → `git push origin production` 순서

---

## 6. production push 시점

| 단계 | 할 일 | `origin/production` push |
|------|--------|-------------------------|
| 1 | `production` 브랜치에서 AAB 빌드 (`APP_ENV=production`, release 서명) | ❌ |
| 2 | Play Console에 AAB 업로드·(필요 시) 심사/출시 준비 | ❌ |
| 3 | Production Railway `MIN_ANDROID_VERSION` 등 env 정리 | ❌ |
| 4 | 로컬 `production` 커밋·반영 완료, 최종 확인 | ✅ **이때 push** |

- AAB를 올리기 **전에** `production`을 push하면 Railway만 먼저 바뀌어 강제 업데이트·스토어 버전과 엇갈릴 수 있습니다.
- 로컬에서 `production` 커밋·머지·체리픽은 가능하지만, Play 업로드·env 정리가 끝날 때까지 **`git push origin production`은 보류**합니다.

---

## 7. 앱 버전

| 항목 | 현재 기준 (develop / production 동일 유지) |
|------|---------------------------------------------|
| `version` | `1.3.0` (`app.json` / `app.config.js`) |
| Android `versionCode` | `7` |

버전 올릴 때: develop 반영·push → AAB·Play → production 반영(체리픽 또는 merge) → push.  
스토어 문구: `RELEASE_NOTES.md`

---

## 8. 로컬 테스트

### Develop Railway (일상)

```powershell
git checkout develop
git pull origin develop
cd front
npm install   # 최초 또는 의존성 변경 시
npm start
# 안드로이드: npm run android
```

### Production Railway (AAB 전 실기기 검증)

```powershell
git checkout production
cd front
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npx cross-env APP_ENV=production expo prebuild --platform android --clean
npm run android:prod
```

백엔드를 로컬에서 띄울 때: `back` README·`.env` 참고.

---

## 9. 관련 경로·문서

| 주제 | 경로 |
|------|------|
| 프론트 | `front/` |
| 백엔드 | `back/` |
| Android AAB·서명 | `front/BUILD_ANDROID.md` |
| 배포 전 점검 | `DEPLOY_PREFLIGHT_CHECKLIST.md` |
| 릴리스 노트 | `RELEASE_NOTES.md` |
| DB 마이그레이션 | `back/docs/` (예: `PERSONAL_MAIL_MIGRATE.md`) |
| 관리자 웹 | `{production 백엔드 URL}/admin` |
| 로컬 경로 | `WORKSPACE.md` |

---

*이 문서가 레포 운영 규칙의 단일 출처(Single Source of Truth)입니다.*
