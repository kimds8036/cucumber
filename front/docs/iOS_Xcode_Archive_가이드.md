# iOS 앱스토어 업로드 — Xcode Archive 가이드

> Youth Paper (`front`) 전용.  
> EAS 없이 Mac + Xcode에서 **Archive → App Store Connect** 올리는 방법과,  
> 지금까지 쓰던 **EAS production 빌드와 안 겹치게** 확인할 항목을 정리합니다.

**명령 한 줄로 IPA 뽑기(자동화):** 저장소 루트 [`docs/ios빌드.md`](../../docs/ios빌드.md)  
→ `cd front && IOS_BUILD_NUMBER=<번호> npm run ios:ipa:prod`

관련 문서: [`빌드_EXPO_PUBLIC_체크리스트.md`](./빌드_EXPO_PUBLIC_체크리스트.md) · [`릴리스_노트.md`](./릴리스_노트.md)

---

## 한 줄 요약

1. **기존 `front/ios`를 그대로** 연다 (`prebuild --clean` 하지 않음)  
2. Xcode에서 **버전·빌드 번호**를 App Store에 이미 올라간 값보다 높게 맞춘다  
3. **프로덕션 env**로 JS를 한 번 맞춰 둔다  
4. **Product → Archive → Distribute App**

EAS와 Xcode는 **같은 앱 ID**로 올리므로, 충돌은 거의 항상 **빌드 번호**와 **네이티브 폴더 상태**에서 납니다.

---

## EAS vs Xcode — 뭐가 다른가

| | EAS (`eas build --profile production`) | Xcode Archive (이 문서) |
|---|---|---|
| 어디서 빌드 | Expo 클라우드 / 로컬 EAS | 내 Mac의 Xcode |
| `ios` 폴더 | gitignore라 **매번 prebuild로 새로 생성** | **로컬 `front/ios`를 그대로 사용** |
| 버전/빌드 | `eas.json`의 `appVersionSource: remote` + `autoIncrement` | **Xcode / Info.plist를 직접** 맞춤 |
| env | `eas.json` production 블록 자동 적용 | **직접** `APP_ENV=production` 등으로 맞춰야 함 |
| 업로드 | `eas submit` 또는 수동 | Organizer → Distribute App |

둘 다 최종 목적지는 **App Store Connect의 같은 앱** (`com.ucost.YouthPaper`)입니다.  
한쪽이 올린 빌드 번호보다 낮은 번호로 다시 올리면 **업로드가 거절**됩니다.

---

## 시작 전 체크 (충돌·오류 방지)

Archive 누르기 전에 아래만 확인하면 EAS와 거의 안 싸웁니다.

### 1) 빌드 번호 (가장 중요)

| 항목 | 의미 | 이 프로젝트 참고 |
|------|------|------------------|
| Version (마케팅 버전) | 사용자에게 보이는 `1.5.16` | `app.config.js` → `version: '1.5.16'` |
| Build (빌드 번호) | 업로드마다 **반드시 증가** | App Store Connect / TestFlight에 **이미 올라간 최댓값 + 1** |

**확인 방법**

1. [App Store Connect](https://appstoreconnect.apple.com) → Youth Paper → **TestFlight** 또는 최근 iOS 빌드  
2. 가장 큰 **빌드 번호**를 적는다 (EAS `autoIncrement`로 올라가 있을 수 있음)  
3. Xcode에서 그보다 **큰 숫자**로 설정한다

**Xcode에서 맞추는 곳**

- TARGET **YouthPaper** → General  
  - Version = `1.5.16` (또는 이번 릴리스 버전)  
  - Build = (ASC 최댓값 + 1)  
- TARGET **YouthPaperWidgets** 도 **같은 Version / Build**로 맞춘다  

> 로컬 `ios`를 보면 메인 Info는 Version `1.5.16`인데 Build가 `1`인 상태일 수 있습니다.  
> EAS로 이미 높은 빌드를 올렸다면 **그대로 Archive하면 거절**됩니다. 반드시 ASC 기준으로 올립니다.

### 2) `prebuild --clean` 하지 않기

로컬에는 이미 위젯 타겟·App Group·서명이 들어 있는 `front/ios`가 있습니다.

```bash
# ❌ 하지 말 것 (위젯/서명 설정이 날아갈 수 있음)
npx expo prebuild --platform ios --clean
```

`ios`가 **아예 없을 때만** prebuild를 새로 하고, 그 뒤에는 위젯 플러그인·서명을 다시 확인합니다.

### 3) AppDelegate 컴파일 이슈 (EAS에서 터졌던 것)

로컬 `AppDelegate.swift`에 아래가 들어가 있을 수 있습니다.

```swift
WidgetBackgroundScheduler.register()
WidgetBackgroundScheduler.scheduleAll()
```

그런데 **`import YouthPaperWidget`이 없으면**  
→ `cannot find 'WidgetBackgroundScheduler' in scope` 로 **Archive도 EAS와 같이 실패**합니다.

**Archive 전 확인**

- [ ] `front/ios/YouthPaper/AppDelegate.swift` 상단에 `import YouthPaperWidget` 이 있는가  
- [ ] 없거나 빌드가 안 되면: 위 두 줄(`register` / `scheduleAll`)을 **잠시 주석/삭제**해도 Archive는 가능  
  (위젯 write API의 `scheduleBackgroundRefresh`로도 스케줄 가능. 백그라운드 자동 갱신만 약해질 수 있음)

### 4) 프로덕션 API / EXPO_PUBLIC (EAS production과 동일하게)

EAS production env (`eas.json`):

- `APP_ENV=production`
- `EXPO_PUBLIC_SIGNUP_TEST_MODE=false`
- `EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=false`
- `EXPO_PUBLIC_INICIS_ENABLED=true`

Xcode Archive는 EAS env를 자동으로 안 넣습니다.  
**Release 번들을 만들기 전**에 터미널에서 한 번 맞춰 두는 것을 권장합니다.

```bash
cd /Users/sage/cucumber/front

# 프로덕션 API URL 확인
APP_ENV=production npm run env:print:prod

# (권장) 프로덕션으로 네이티브 실행/번들 한 번 맞추기
APP_ENV=production \
EXPO_PUBLIC_SIGNUP_TEST_MODE=false \
EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=false \
EXPO_PUBLIC_INICIS_ENABLED=true \
npx expo export:embed --platform ios
```

또는 Xcode Archive 직전에:

```bash
cd /Users/sage/cucumber/front
APP_ENV=production \
EXPO_PUBLIC_SIGNUP_TEST_MODE=false \
EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=false \
EXPO_PUBLIC_INICIS_ENABLED=true \
npx expo run:ios --configuration Release --device
```

> 이미 `ios`가 Release용으로 잘 빌드된 상태면, Xcode에서 Archive만 해도 됩니다.  
> 다만 **개발용으로만** 돌리다가 Archive하면 develop API가 들어갈 수 있으니, 스토어용이면 위 env를 꼭 맞춥니다.

상세 플래그: [`빌드_EXPO_PUBLIC_체크리스트.md`](./빌드_EXPO_PUBLIC_체크리스트.md)

### 5) Pods / 위젯 소스

```bash
cd /Users/sage/cucumber/front/ios
pod install
```

- 위젯 Swift를 `modules/.../targets/YouthPaperWidgets/` 에서 고쳤다면  
  → `front/ios/YouthPaperWidgets/` 에도 반영됐는지 확인 (prebuild/플러그인이 복사. Metro만으로는 안 감)

### 6) EAS와 동시에 올리지 않기

같은 버전을 EAS와 Xcode에서 **동시에** 올리면 빌드 번호만 다르고 혼란만 큽니다.

- 이번 릴리스는 **Xcode만** 쓰거나  
- 이번 릴리스는 **EAS만** 쓰기  
둘 중 하나로 정하는 것이 안전합니다.

---

## 단계별: Xcode Archive

### STEP 0 — 준비물

- [ ] Apple Developer 계정 (Team 선택 가능)
- [ ] App Store Connect에 앱 `com.ucost.YouthPaper` 존재
- [ ] Mac에 Xcode 설치, Apple ID 로그인
- [ ] 위 **시작 전 체크** 통과

---

### STEP 1 — 프로젝트 열기

```bash
cd /Users/sage/cucumber/front
xed ios
```

또는 Finder에서:

`front/ios/YouthPaper.xcworkspace` 더블클릭

> **반드시 `.xcworkspace`** 를 엽니다. `.xcodeproj`만 열면 Pods 링크가 깨집니다.

---

### STEP 2 — Signing & Capabilities

1. 왼쪽 네비게이터에서 파란 **YouthPaper** 프로젝트 클릭  
2. TARGETS → **YouthPaper**  
3. **Signing & Capabilities**  
   - Team: 본인 팀  
   - Bundle Identifier: `com.ucost.YouthPaper`  
4. TARGETS → **YouthPaperWidgets**  
   - Team: 동일  
   - Bundle Identifier: `com.ucost.YouthPaper.YouthPaperWidgets`  
   - App Groups: `group.com.ucost.YouthPaper` (메인 앱과 동일)

자동 서명(Automatically manage signing) 켜 두면 됩니다.

---

### STEP 3 — 버전 / 빌드 번호

**YouthPaper** 타겟 → General

| 필드 | 예시 |
|------|------|
| Version | `1.5.16` |
| Build | App Store Connect 최댓값 + 1 (예: 이미 30이면 → `31`) |

**YouthPaperWidgets** 타겟도 Version / Build를 **메인과 동일**하게.

---

### STEP 4 — 스킴 / 기기

상단 툴바:

1. Scheme: **YouthPaper**  
2. Destination: **Any iOS Device (arm64)**  

시뮬레이터가 선택돼 있으면 **Archive 메뉴가 비활성**입니다.

(선택) Product → Scheme → Edit Scheme… → **Archive** 탭  
→ Build Configuration = **Release** (기본값이면 그대로)

---

### STEP 5 — Archive

1. 메뉴 **Product → Archive**  
2. 빌드가 끝날 때까지 대기  
3. 성공하면 **Organizer** 창이 열림  

실패하면 보통:

- Signing / Provisioning  
- `WidgetBackgroundScheduler` scope (위의 import / 호출 줄)  
- 위젯 타겟 누락  

에러 로그 첫 빨간 줄을 보면 됩니다.

---

### STEP 6 — App Store Connect로 업로드

Organizer에서:

1. 방금 만든 Archive 선택  
2. **Distribute App**  
3. **App Store Connect** → Next  
4. **Upload** → Next  
5. 옵션은 기본(자동 서명)으로 진행  
6. Upload 완료까지 대기  

---

### STEP 7 — TestFlight / 심사

1. [App Store Connect](https://appstoreconnect.apple.com) → 앱 선택  
2. **TestFlight**에서 빌드 처리 완료 대기 (수 분~수십 분)  
3. 필요하면 내부 테스트  
4. **앱 스토어** 탭에서 버전 만들고 빌드 선택 → 심사 제출  

강제 업데이트(`MIN_IOS_VERSION`)는 **스토어 반영 후**에만 올립니다. ([`릴리스_노트.md`](./릴리스_노트.md) 참고)

---

## 자주 막는 오류 → 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| Archive 메뉴 회색 | 시뮬레이터 선택됨 | **Any iOS Device (arm64)** |
| `WidgetBackgroundScheduler` not in scope | AppDelegate에 호출만 있고 import 없음 / 모듈 미링크 | `import YouthPaperWidget` 추가, 또는 해당 2줄 제거 후 `pod install` |
| Invalid Bundle / 빌드 번호 | ASC에 이미 같은·낮은 Build 존재 | Build를 ASC 최댓값보다 크게 |
| 위젯 Signing 실패 | 위젯 타겟 Team/App Group 미설정 | YouthPaperWidgets Signing 확인 |
| 앱이 develop API를 침 | Archive 전 `APP_ENV`가 production이 아님 | STEP 시작 전 env 체크리스트 |
| EAS는 되고 Xcode만 안 됨 (또는 반대) | EAS는 새 prebuild, 로컬 `ios`는 오래된 상태 | 로컬은 clean 없이 위젯·AppDelegate만 고침. EAS는 모듈 `ios/`가 git에 있어야 함 |

---

## EAS로 다시 돌아갈 때

Xcode로 한 번 올렸어도 EAS production은 그대로 쓸 수 있습니다.

- `eas.json`의 `appVersionSource: "remote"` + `autoIncrement` 가  
  **App Store Connect의 최신 빌드 번호**를 보고 다음 번호를 잡습니다.  
- 따라서 Xcode로 올린 빌드가 더 높아도, 다음 EAS 빌드는 보통 그 위로 올라갑니다.  
- 다만 **로컬 `ios` 수정은 git에 안 올라가므로**, EAS가 다시 쓰는 건 **플러그인 + 모듈 소스**입니다.  
  AppDelegate에만 손으로 고친 내용은 EAS에 **반영되지 않습니다.**

정리:

| 고친 곳 | Xcode Archive | 다음 EAS |
|---------|---------------|----------|
| `modules/youth-paper-widget/` (커밋됨) | 로컬 ios에 복사돼 있으면 반영 | prebuild 시 반영 |
| `front/ios/...`만 수동 수정 | 바로 반영 | **반영 안 됨** (gitignore) |
| `app.config.js` / `eas.json` | Archive env는 수동 | EAS가 자동 사용 |

---

## 최소 체크리스트 (복붙용)

```
[ ] ASC에서 최신 iOS Build 번호 확인 → Xcode Build = 그 값 + 1
[ ] YouthPaper / YouthPaperWidgets Version·Build 동일
[ ] Team / Bundle ID / App Group 확인
[ ] Destination = Any iOS Device (arm64)
[ ] AppDelegate: import YouthPaperWidget 있거나, Scheduler 호출 제거
[ ] APP_ENV=production + EXPO_PUBLIC_* 스토어용 플래그
[ ] pod install 완료
[ ] Product → Archive → Distribute → App Store Connect
[ ] TestFlight 처리 완료 후 심사 (또는 내부 테스트)
```

---

## 빠른 명령 모음

```bash
# 워크스페이스 열기
cd /Users/sage/cucumber/front && xed ios

# Pods
cd /Users/sage/cucumber/front/ios && pod install

# 프로덕션 API 확인
cd /Users/sage/cucumber/front && APP_ENV=production npm run env:print:prod
```

Bundle ID: `com.ucost.YouthPaper`  
Widget: `com.ucost.YouthPaper.YouthPaperWidgets`  
App Group: `group.com.ucost.YouthPaper`
