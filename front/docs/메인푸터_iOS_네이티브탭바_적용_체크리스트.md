# 메인 푸터 iOS 네이티브 탭 바 적용 체크리스트

> 대상: 탭 바 테스트 화면(`view/src/TabBarTestScreen.jsx`)에 띄운 네이티브 `UITabBar`를 iOS 메인 푸터로 쓴다.  
> 끝나면 테스트 화면을 없애고 앱이 원래 시작 흐름(스플래시 → 로그인/메인)으로 뜨게 한다.  
> 탭 전환은 지금처럼 `MainTabNavigator`의 `navigation.navigate`다. 네이티브는 탭 바를 그리고 누른 탭 번호만 JS로 보낸다.  
> Android와 그 외 플랫폼은 지금 `MainFooter`를 그대로 쓴다.  
> 사용자 가이드 화면(`GuideOverlayScreen.jsx`)은 범위에서 뺀다. 가이드는 iOS에서도 지금 푸터를 그린다.  
> prebuild는 하지 않는다. 네이티브 수정 뒤에는 `ios/`에서 `pod install`, Xcode에서 개발 클라이언트를 다시 빌드한다.

## 지금 상태

- (작업 전) `modules/tab-bar-test/ios/TabBarTestView.swift`는 색 블록 스크롤 뷰와 그 위의 `UITabBar`를 그렸다. 탭을 눌러도 JS로 알리지 않았다. 1단계에서 `modules/youth-paper-tab-bar`로 바꿨다
- 탭 순서·아이콘·색은 3절 "아이콘·색"을 따른다
- `App.js`의 `SHOW_TAB_BAR_TEST = true`면 앱 전체 대신 `TabBarTestScreen`만 그린다
- `TabBarTestScreen`이 스플래시를 직접 내린다. 원래 흐름에서는 `SplashHideWhenReady`가 내린다
- (작업 전) `getTabBarTestView()`는 `requireNativeViewManager`가 예외를 던지지 않아서 네이티브 뷰가 없는 바이너리에서도 `null`이 아니다. 그 결과 빈 화면이 된다
- `MainFooter`를 쓰는 곳: `MainTabNavigator`(메인 탭), `timer.jsx`, `Message.jsx`, `boardAll.jsx`, `GuideOverlayScreen.jsx`
- `docs/메인푸터_네이티브_개편_체크리스트.md`에 체크된 `MainFooterIOS.jsx`, `expo-glass-effect`는 코드에 없다. 이 문서는 그 iOS 절을 대신한다

---

## 0. 작업 순서

- [x] 1단계: 네이티브 탭 바 뷰를 메인 푸터용으로 바꾼다 (`selectedIndex` prop, `onTabSelect` 이벤트)
- [ ] 2단계: `pod install`, Xcode 재빌드. 테스트 화면에서 탭을 눌러 이벤트가 오는지 본다 (빌드·시뮬레이터 표시까지 했다. 탭 누르기 확인만 남았다)
- [x] 3단계: JS에서 네이티브 뷰 유무를 제대로 판별한다
- [x] 4단계: `MainFooterIOS.jsx`를 만들고 `mainFooter.jsx`에서 iOS만 보낸다
- [ ] 5단계: 메인 화면에서 동작을 확인한다
- [x] 6단계: 테스트 화면을 없애고 원래 시작 흐름으로 되돌린다

---

## 1. 네이티브 뷰

경로: `modules/youth-paper-tab-bar/ios/`.

### 모듈 이름

- [x] 모듈 폴더를 `modules/youth-paper-tab-bar`로, 모듈 `Name`을 `"YouthPaperTabBar"`로 바꾼다. 테스트용 이름을 메인 푸터에 남기지 않는다
- [x] 함께 바꿀 곳: `package.json` 의존성(`file:modules/youth-paper-tab-bar`), `modules/.../package.json`의 `name`, `expo-module.config.json`의 `ios.modules`, podspec 파일명과 `s.name`, 루트 `.gitignore`의 `!front/modules/.../ios/` 예외 두 줄
- [x] 이름을 바꾼 뒤 `npm install`로 `node_modules` 링크를 다시 만든다

### `YouthPaperTabBarView.swift`

- [x] `ExpoView` 안에는 `UITabBar` 하나만 둔다. 테스트용 스크롤 뷰와 색 블록은 지운다
- [x] 탭 바는 뷰의 위·좌·우·아래에 붙인다. 테스트처럼 `safeAreaLayoutGuide`에 붙이지 않는다
- [x] 하단 safe area는 네이티브 탭 바가 채운다. `safeAreaInsetsDidChange`에서 높이를 다시 잰다
- [x] 탭 라벨은 네이티브에 고정한다. 아이콘·색은 JS prop으로 받는다 (3절 "아이콘·색")
- [x] `setSelectedIndex(_:)`는 `tabBar.selectedItem`만 바꾼다. 이벤트를 보내지 않는다
- [x] `UITabBarDelegate.tabBar(_:didSelect:)`에서 `onTabSelect(["index": item.tag])`를 보낸다. 선택 표시는 JS가 `selectedIndex`로 다시 내려줄 때 확정된다

### `YouthPaperTabBarModule.swift`

- [x] `View(YouthPaperTabBarView.self)` 안에 `Events("onTabSelect")`
- [x] `Prop("selectedIndex") { (view, index: Int) in view.setSelectedIndex(index) }`
- [x] 탭 수·라벨을 prop으로 받지 않는다. 다섯 탭은 네이티브에 고정한다

### 빌드

- [x] `cd ios && pod install`. `ExpoModulesProvider.swift`에 `YouthPaperTabBarModule`이 들어갔는지 본다
- [x] Xcode에서 `⌘⇧K` 후 `⌘R`. 터미널 `xcodebuild`와 Xcode 빌드를 동시에 돌리지 않는다 (`unable to initiate PIF transfer session`)

### 높이

- [x] JS에서 높이를 49로 고정하면 iOS 26 이상 유리 탭 바가 눌려 아이콘이 잘리고 라벨이 아이콘 위로 올라간다
- [x] 네이티브가 `layoutSubviews`에서 `tabBar.sizeThatFits`로 높이를 구해 `onPreferredHeightChange({ height })`로 보낸다. 값이 바뀔 때만 보낸다
- [x] JS는 첫 값 49로 그리고, 이벤트가 오면 그 높이로 바꾼다. iPhone 17 Pro 시뮬레이터(iOS 26.5)에서 83이다

### 테스트 화면 확인

- [x] `TabBarTestScreen`은 하단에 탭 바를 두고, 누른 탭 키와 탭 바 높이를 화면 가운데에 보여준다
- [x] 시뮬레이터에서 탭 바가 잘리지 않고 그려진다. 높이 이벤트가 JS에 온다
- [ ] 다섯 탭을 누를 때마다 가운데 글자가 `board` → `mypage`로 바뀐다
- [x] 선택 안 된 탭 색은 `UITabBarAppearance`와 색 칠한 아이콘 이미지로 준다 (아이콘·색 절)

---

## 2. JS 모듈

경로: `modules/youth-paper-tab-bar/src/index.js`.

- [x] `requireOptionalNativeModule('YouthPaperTabBar')`가 `null`이면 `NativeTabBarView`도 `null`이다. 모듈이 있을 때만 `requireNativeViewManager('YouthPaperTabBar')`를 부른다
- [x] 결과는 모듈 최상단에서 한 번만 계산해 export한다. 렌더마다 `requireNativeViewManager`를 부르지 않는다
- [ ] 네이티브 뷰가 없는 개발 클라이언트·스토어 바이너리에서는 기존 `MainFooter`가 나와야 한다

---

## 3. `MainFooterIOS.jsx`

경로: `view/frame/MainFooterIOS.jsx`.

- [x] props는 `MainFooter`와 같다: `activeTab`, `onTabPress`. 없으면 `useMainShellOptional()` 값을 쓰는 것도 `MainFooter`와 같다
- [x] 탭 키 순서 배열 `['timer', 'school', 'board', 'message', 'mypage']`를 둔다. 네이티브 탭 순서와 같아야 한다
- [x] 탭 순서는 타이머, 우리 학교, 게시판, 메시지, 마이페이지다. 기존 흰 푸터(Android·가이드) 순서는 그대로다
- [x] 선택 기본값은 게시판이다. 네이티브 초기 선택과 JS에서 `activeTab`을 못 찾을 때 모두 게시판

### 아이콘·색

| 탭 | 비활성 | 활성 |
|---|---|---|
| 타이머 | `Ionicons time-outline` | `Ionicons time` |
| 우리 학교 | `Ionicons school-outline` | `Ionicons school` |
| 게시판 | `Ionicons document-text-outline` | `Ionicons document-text` |
| 메시지 | `Ionicons chatbubble-outline` | `Ionicons chatbubble` |
| 마이페이지 | `Ionicons person-outline` | `Ionicons person` |

- [x] 아이콘 이름은 `MainFooterIOS.jsx`의 `TABS`에 둔다. JS가 `getRawGlyphMap()`으로 글리프 코드를 구해 `icons` prop으로 넘긴다
- [x] 네이티브는 `ios/Fonts/`의 폰트 사본(`Octicons`, `Ionicons`, `MaterialCommunityIcons`)을 `YouthPaperTabBarFonts` 리소스 번들로 넣고 직접 등록한다. 글리프를 `UIImage`로 그려 `image`/`selectedImage`에 쓴다
- [x] 색은 `activeColor`(`colors.text`), `inactiveColor`(`colors.textLight2`) prop이다. 아이콘은 색을 칠한 이미지, 글자는 `UITabBarAppearance`로 준다
- [x] 아이콘·색 prop이 바뀔 때만 탭 항목을 다시 만든다. 탭 선택만 바뀌면 다시 만들지 않는다
- [ ] 기기에서 아이콘 10개가 모두 보이고, 활성·비활성 색이 맞다
- [ ] `@expo/vector-icons`를 올리면 `ios/Fonts/` 폰트도 같은 버전으로 다시 복사한다. 글리프 코드가 바뀔 수 있다
- [x] `selectedIndex`는 `activeTab`의 배열 인덱스. 못 찾으면 0
- [x] `onTabSelect={({ nativeEvent }) => ...}`에서 `nativeEvent.index`를 탭 키로 바꿔 `onTabPress?.(tab)`
- [x] 높이는 `onPreferredHeightChange`로 받은 값을 쓴다. 첫 값은 49. `FOOTER_HEIGHT`(65)를 쓰지 않는다
- [x] 흰 배경 컨테이너와 삼각형 `activeTabIndicator`는 그리지 않는다

### 분기

경로: `view/frame/mainFooter.jsx`.

- [x] 맨 위에서 `Platform.OS === 'ios'`이고 네이티브 뷰가 있으면 `MainFooterIOS`를 반환한다
- [x] 그 외에는 지금 `View` + `TouchableOpacity` 그리기를 그대로 둔다
- [x] `MainTabNavigator`의 `tabBar`, `navigation.navigate`는 수정하지 않는다
- [x] 분기를 `mainFooter.jsx`에 두므로 `timer.jsx`, `Message.jsx`, `boardAll.jsx`에도 같은 탭 바가 나온다. 각 화면의 `onTabPress` 처리는 그대로 동작해야 한다
- [x] 지금 그리기 코드를 `MainFooterLegacy`로 이름 붙여 named export한다. 기본 export `MainFooter`는 분기만 한다
- [x] `GuideOverlayScreen.jsx`는 `MainFooterLegacy`를 import한다. 그 외 가이드 코드는 수정하지 않는다

### 여백

- [x] JS가 탭 바 주변에 두는 여백은 감싸는 `SafeAreaView`의 하단 safe area뿐이다. 좌우·위 여백은 없다
- [x] `mainFooter.jsx`가 `USES_NATIVE_TAB_BAR`, `MAIN_FOOTER_SAFE_AREA_EDGES`를 export한다. 네이티브 탭 바면 `['top']`, 아니면 `['top', 'bottom']`
- [x] `MainScreen.jsx`, `timer.jsx`, `Message.jsx`, `boardAll.jsx`의 `SafeAreaView` edges를 `MAIN_FOOTER_SAFE_AREA_EDGES`로 바꾼다
- [ ] 탭 바가 화면 맨 아래까지 닿고, 아이콘·라벨이 홈 인디케이터 위에 있다
- [ ] iOS 26 유리 탭 바 둘레의 좌우·아래 간격은 UIKit이 그리는 것이다. 없애려면 네이티브에서 따로 다뤄야 한다

---

## 4. 확인

- [ ] 다섯 탭을 차례로 누르면 화면이 바뀌고 선택 탭 색이 `#A6DA95`로 바뀐다
- [ ] 같은 탭을 다시 눌러도 화면이 다시 마운트되지 않는다 (`MainTabBar`의 `tab !== activeTab` 조건)
- [ ] 위젯·푸시 딥링크로 `initialTab`이 들어오면 탭 바 선택도 그 탭이다
- [ ] 탭 바가 홈 인디케이터와 겹치지 않고, 그 위로 빈 간격이 두 번 생기지 않는다
- [ ] `FloatingButton`의 `aboveFooter`(35 고정 여백) 버튼이 탭 바와 겹치지 않는다. 겹치면 그 값만 조정한다
- [ ] 키보드가 올라오는 화면에서 탭 바가 가리거나 튀지 않는다
- [ ] iOS 가이드 화면은 지금처럼 흰 푸터로 나온다
- [ ] Android 빌드에서 푸터가 바뀌지 않았다

---

## 5. 테스트 화면 종료

- [x] `App.js`에서 `import TabBarTestScreen`, `SHOW_TAB_BAR_TEST` 상수, `if (SHOW_TAB_BAR_TEST) { return <TabBarTestScreen />; }` 블록을 지운다
- [x] `view/src/TabBarTestScreen.jsx`를 지운다. 이 화면에 넣은 `SplashScreen.hideAsync()`도 같이 사라진다
- [x] 1단계에서 테스트용 스크롤 뷰가 지워졌는지 한 번 더 본다
- [ ] Metro를 `npx expo start --dev-client -c`로 다시 켠다

### 원래 시작 흐름 확인

- [x] 스플래시가 `SplashHideWhenReady`에 의해 내려간다 (폰트 로드, 버전 확인, 인증 하이드레이션 이후). 시뮬레이터에서 확인했다
- [ ] 로그아웃 상태에서는 로그인 화면, 로그인 상태에서는 메인 게시판 탭이 뜬다 (로그아웃 → 로그인 시작 화면은 시뮬레이터에서 확인했다)
- [ ] 스플래시 광고(`splash_ad`)가 있으면 광고 뒤 메인으로 넘어간다
- [ ] 메인 하단에 네이티브 탭 바가 보인다

---

## 주의

- 로컬 `front/ios`는 gitignore라 커밋되지 않는다. 팀원은 pull 뒤 `npm install`, `cd ios && pod install`, Xcode 재빌드를 해야 탭 바가 보인다. 안 하면 3단계 판별 덕에 기존 푸터가 나온다
- 로컬 `ios`의 `SceneDelegate.swift`와 서명 팀 설정은 config plugin 없이 직접 넣은 것이다. `prebuild`를 다시 하면 사라지고 UIScene 크래시와 서명 오류가 다시 난다
- iOS 26 이상 SDK로 빌드하면 `UITabBar`에 Liquid Glass 재질이 자동으로 적용된다. iOS 26 미만 기기에서는 기본 불투명 탭 바로 보인다
- 탭 아이콘은 `@expo/vector-icons` 폰트 글리프를 네이티브에서 그린다. SF Symbol이나 `Logo.svg`는 쓰지 않는다
