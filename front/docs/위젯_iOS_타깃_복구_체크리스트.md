# iOS 위젯 타깃 복구 체크리스트 (prebuild 없이)

## 배경

- 홈 화면 위젯 목록에 앱이 안 나오는 이유: 현재 `front/ios` 프로젝트에 **Widget Extension 타깃이 없음**
  - `project.pbxproj`에 `YouthPaperWidgets`는 빈 폴더 그룹으로만 존재 (app-extension 타깃, Embed 단계 없음)
  - 빌드된 `YouthPaper.app` 안에 `PlugIns/` 폴더(위젯 `.appex`)가 없음
- 왜 없어졌나
  - 위젯 플러그인(`withYouthPaperWidget.js`)은 소스 복사·App Group만 해 주고 **타깃은 만들지 않음** (Xcode에서 손으로 추가하는 방식)
  - 예전 작업자 컴퓨터의 `ios`에는 손으로 만든 타깃이 있었지만, `ios/`가 gitignore라 저장소에 남지 않음
  - 이 컴퓨터의 `ios`는 prebuild로 새로 생성 → 타깃 없음
- 이번 방침: **prebuild를 다시 하지 않고**, 지금 `ios` 프로젝트에 Xcode로 위젯 타깃을 직접 추가한다
  - prebuild를 안 하므로 SceneDelegate 등 손으로 넣은 설정도 그대로 유지됨



## 현재 확인된 사실


| 항목                          | 값                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Xcode                       | 27.0                                                                                                                            |
| 메인 앱 번들 ID                  | `com.ucost.YouthPaper`                                                                                                          |
| Team ID                     | `J7QWZFS9HR`                                                                                                                    |
| App Group                   | `group.com.ucost.YouthPaper` (메인 앱 entitlements에 이미 있음)                                                                         |
| 메인 앱 최소 iOS                 | 16.4                                                                                                                            |
| 위젯 코드 최소 iOS                | 16.4로 충분 (`containerBackground`는 `#available(iOS 17.0, *)`로 감싸져 있음)                                                             |
| 위젯 종류                       | `MealWidget`(small), `TimetableWidget`(medium·large)                                                                            |
| 위젯 소스 원본                    | `modules/youth-paper-widget/targets/YouthPaperWidgets/` + `modules/youth-paper-widget/ios/WidgetShared/WidgetSharedStore.swift` |
| `ios/YouthPaperWidgets/` 사본 | 원본과 내용 동일 (2026-10-06 확인)                                                                                                       |
| 메인 앱 버전                     | `ios/YouthPaper/Info.plist` = 1.8.0 (33) ↔ `app.config.js` = 1.9.1 (35) **불일치**                                                 |


---



## 1단계. 사전 확인 · 백업

- [x] 예전 위젯 번들 ID 확인 → **`com.ucost.YouthPaper.YouthPaperWidgets`**
  - 이 Mac의 프로비저닝 프로파일로 확인 (포털 직접 확인은 아님)
    - 개발용: `iOS Team Provisioning Profile: com.ucost.YouthPaper.YouthPaperWidgets` (만료 2027-09-07)
    - 배포용: `iOS Team Store Provisioning Profile: com.ucost.YouthPaper.YouthPaperWidgets` (만료 2027-08-21)
- [x] App Group 확인 → 두 프로파일 모두 `group.com.ucost.YouthPaper` 포함
- [x] `front/ios` 백업 → `~/ios-backup-20261006-0128/` (`Pods`·`build` 제외, 1.2MB)
  - 되돌릴 때: `rsync -a --delete --exclude Pods --exclude build ~/ios-backup-20261006-0128/ front/ios/`
- [ ] Xcode에서 `ios/YouthPaper.xcworkspace`를 연 상태로 진행 (터미널 `xcodebuild`는 Xcode 열려 있을 때 쓰지 않기)



## 2단계. 기존 빈 그룹·폴더 정리

Xcode가 타깃을 만들 때 같은 이름의 폴더를 새로 만들기 때문에, 기존 것과 겹치지 않게 먼저 비켜 둔다.

- [x] 빈 `YouthPaperWidgets` 그룹 참조 제거 (`project.pbxproj`에서 그룹 정의·메인 그룹 children 항목 삭제, `plutil -lint` OK)
- [x] `ios/YouthPaperWidgets` → `ios/YouthPaperWidgets_old`로 이름 변경 (4단계에서 Assets·entitlements를 여기서 가져옴)
- [x] `README_SETUP.md` 삭제
- [ ] **[직접]** Xcode가 열려 있었다면 "프로젝트 파일이 바뀌었다" 창에서 **Revert / Read From Disk** 선택 → 왼쪽 목록에 `YouthPaperWidgets` 그룹이 없어졌는지 확인

> 이후 단계에서 **[직접]** = Xcode 화면에서 사용자가 할 일, **[AI]** = 터미널·파일 수정으로 처리할 일



## 3단계. Widget Extension 타깃 추가

- [x] **[직접]** Xcode → File → New → Target → **Widget Extension**
- [x] **[직접]** 입력값
  - Product Name: `YouthPaperWidgets`
  - Team: `J7QWZFS9HR`
  - Bundle Identifier: `com.ucost.YouthPaper.YouthPaperWidgets` (기존 출시 ID — 바꾸면 안 됨)
  - Include Live Activity: **끔**
  - Include Control: **끔**
  - Include Configuration App Intent: **끔** (현재 위젯은 `StaticConfiguration`)
  - Embed in Application: `YouthPaper`
- [x] **[직접]** "Activate scheme?" 창 → Activate (위젯만 따로 실행해 볼 때 씀. 메인 앱 실행은 `YouthPaper` 스킴)
- [x] **[AI]** 메인 앱 타깃 → Build Phases에 **Embed Foundation Extensions**가 생기고 `YouthPaperWidgetsExtension.appex`가 들어 있음
  - 타깃 이름은 Xcode 기본값대로 `YouthPaperWidgetsExtension` (번들 ID는 `com.ucost.YouthPaper.YouthPaperWidgets`로 정상)
  - 폴더는 Xcode 16+ 방식(폴더 안 파일 자동 포함, synchronized folder)으로 생성됨
- [x] **[AI]** 빌드 순환(Cycle inside YouthPaper) 해결 — `Embed Foundation Extensions`를 `Resources` 바로 다음으로 이동
  - 원인: 맨 끝에 붙은 Embed 단계가 앱 `Info.plist`를 고치는 `[CP-User] [RNFB] Core Configuration` 스크립트 뒤에 있어 서로를 기다림
  - 나중에 Xcode가 순서를 다시 바꾸면 같은 오류가 나니, Build Phases에서 Embed 단계가 스크립트들보다 위에 있는지 확인



## 4단계. 템플릿 파일을 우리 위젯 소스로 교체

- [x] **[AI]** Xcode가 만든 템플릿 Swift 파일(`YouthPaperWidgets.swift`, `YouthPaperWidgetsBundle.swift`)·템플릿 `Assets.xcassets` 삭제
- [x] **[AI]** Xcode가 만든 `Info.plist`는 **남겨 둠** (`NSExtension` → `com.apple.widgetkit-extension` 설정이 들어 있음)
- [x] **[AI]** 새 `ios/YouthPaperWidgets/` 폴더에 아래 파일 넣기 (Swift는 `modules/youth-paper-widget/...` 원본을 가리키는 심볼릭 링크, Assets·entitlements도 원본 링크)
  - `MealWidget.swift`
  - `TimetableWidget.swift`
  - `WidgetModels.swift`
  - `YouthPaperWidgetsBundle.swift` (`@main`은 이 파일 하나만 있어야 함)
  - `WidgetSharedStore.swift`
  - `Assets.xcassets` (`MealRice`, `YouthPaperLogo` 이미지)
  - `YouthPaperWidgets.entitlements`
- [x] **[AI]** 파일들이 **위젯 타깃에만** 포함됐는지 확인 (synchronized folder가 위젯 타깃에만 연결됨)
  - `Info.plist`, `YouthPaperWidgets.entitlements`는 리소스로 복사되지 않게 예외 처리
  - ⚠️ `Assets.xcassets`만은 **실제 복사본** — 폴더 심볼릭 링크는 Xcode가 이미지 폴더로 인식하지 않아 위젯에 아이콘(`YouthPaperLogo`, `MealRice`)이 빠졌음
    - 위젯 이미지를 바꾸면 `modules/youth-paper-widget/targets/YouthPaperWidgets/Assets.xcassets` → `ios/YouthPaperWidgets/Assets.xcassets`로 다시 복사
  - `WidgetSharedStore.swift`는 메인 앱 쪽엔 위젯 모듈(Pod)로 이미 들어가므로 메인 타깃에는 넣지 않음
- [x] **[AI]** 위젯 Swift 타입 검사 통과 (`swiftc -typecheck`, iOS 16.4, 새 타깃의 Swift 옵션과 동일하게)
- [x] **[AI]** 옛 사본 폴더 `ios/YouthPaperWidgets_old` 삭제 (원본은 `modules/`, 백업은 `~/ios-backup-20261006-0128/`)
- [ ] **[직접]** Xcode 왼쪽 목록의 `YouthPaperWidgets` 폴더에 위 파일들이 보이는지 확인 (화살표 달린 링크 아이콘이어도 정상)



## 5단계. 위젯 타깃 설정

YouthPaperWidgets 타깃 선택 후:

- [x] **[AI]** Minimum Deployments: 27.0(Xcode 기본값) → **16.4**
- [x] **[AI]** Version / Build: **1.9.1 / 35** — 위젯·메인 앱 build setting과 메인 `Info.plist`(1.8.0/33 → 1.9.1/35) 모두
- [x] **[AI]** Code Signing Entitlements = `YouthPaperWidgets/YouthPaperWidgets.entitlements` (Debug·Release)
- [x] **[AI]** Swift Language Version 5.0 — 메인 앱과 동일
- [x] **[AI]** 템플릿용 색상 설정(`AccentColor`, `WidgetBackground`) 제거 — 우리 Assets에 없는 색이라 경고가 나기 때문
- [ ] **[직접]** Signing & Capabilities → Team `J7QWZFS9HR`, Automatically manage signing → 서명 오류 없는지
- [ ] **[직접]** Signing & Capabilities → App Groups에 `group.com.ucost.YouthPaper`가 체크돼 있는지 (없으면 **+ Capability → App Groups**로 추가)
- [ ] **[직접]** 메인 앱 타깃 Signing & Capabilities에도 App Groups `group.com.ucost.YouthPaper`가 체크돼 있는지 재확인



## 6단계. 빌드 · 확인

- [ ] **[직접]** `YouthPaper` 스킴으로 실기기 빌드 (Metro는 켜 둔 상태)
- [ ] **[AI]** 빌드 결과 `YouthPaper.app/PlugIns/YouthPaperWidgets.appex`가 있는지 확인
- [ ] **[직접]** 홈 화면 길게 누르기 → + → 위젯 목록에 **청춘신문(YouthPaper)** 이 보이는지
- [ ] **[직접]** 급식(small), 시간표(medium·large) 추가되는지
- [ ] **[직접]** 앱에서 시간표 저장 → 위젯 갱신되는지 (App Group 공유 데이터 확인)
- [ ] **[직접]** 위젯 탭 → `youthpaper://school` 등으로 앱이 열리는지
- [ ] **[직접]** Archive(Release)에서도 서명 오류 없이 만들어지는지



## 7단계. 다시 사라지지 않게 하기

prebuild를 안 해도 `ios/`가 gitignore인 이상, 이 컴퓨터의 `ios`가 지워지거나 다른 사람이 클론하면 또 없어진다.

- [ ] 질문 4 답에 따라 처리
- [ ] (공통) `docs/iOS_Xcode_Archive_가이드.md`에 "위젯 타깃은 Xcode에서 직접 관리, prebuild 금지" 명시
- [ ] (공통) 위젯 플러그인 `withWidgetExtensionSources`의 소스 복사가 실수로 prebuild될 때 파일을 덮어쓰지 않는지 확인 (질문 5)

---



## 질문 (답 적어 주세요)

1. **위젯 번들 ID**: 위젯이 들어간 iOS 버전을 App Store에 낸 적이 있나요? 있다면 Apple Developer Identifiers에 있는 위젯 번들 ID를 그대로 써야 사용자 홈 화면 위젯이 유지됩니다. (없으면 `com.ucost.YouthPaper.YouthPaperWidgets` 사용)
  - 답: 있어
2. **소스 파일 넣는 방식**
  - (A) 심볼릭 링크: `ios/YouthPaperWidgets/*.swift`가 `modules/youth-paper-widget/...` 원본을 가리킴 → 원본 하나만 고치면 됨 (권장)
  - (B) 복사: 지금처럼 사본 유지 → 위젯 수정 시 두 군데를 맞춰야 함
  - 답:(A) 심볼릭 링크: `ios/YouthPaperWidgets/*.swift`가 `modules/youth-paper-widget/...` 원본을 가리킴
3. **버전 번호**: 메인 앱 Info.plist는 1.8.0 (33), `app.config.js`는 1.9.1 (35)입니다. 메인·위젯 모두 어느 값으로 맞출까요?
  - 답: `app.config.js로 맞춰줘`
4. `ios` **폴더 보존 방법**
  - (A) `front/ios`를 git에 올린다 (`.gitignore`에서 제외, `Pods/`·`build/`는 계속 제외) → 위젯 타깃·SceneDelegate가 저장소에 남고, EAS도 prebuild 없이 이 프로젝트로 빌드함
  - (B) git에는 안 올리고 로컬 백업만 유지 → 지금처럼 로컬 Xcode Archive로만 배포
  - 답:(B) git에는 안 올리고 로컬 백업만 유지 → 지금처럼 로컬 Xcode Archive로만 배포
5. **위젯 플러그인 소스 복사 기능**: prebuild를 안 쓰기로 했으니 `withWidgetExtensionSources`(소스 복사 + 빈 그룹 생성)를 제거할까요, 그대로 둘까요? (App Group·백그라운드 작업 ID·안드로이드 설정은 유지)
  - 답:그대로 둬 (App Group·백그라운드 작업 ID·안드로이드 설정은 유지)

