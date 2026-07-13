# 광고 / Tip 슬롯 분리 · 정책 체크리스트 v2

v1 대비 변경점 요약:

- **0단계 신설**: 백엔드 API 계약 미확정 상태를 어댑터로 격리 (`adsApiAdapter.js`)
- **게이트 우선순위 확정**: 오프라인 > 강제 업데이트 > 광고 모달
- **`commute_banner`**: 디자인은 보류, 슬롯 인프라만 먼저 구현
- **`feed_alert` 신설**: 알림 화면 광고
- **`top_banner`로 통합**: 검색 결과 / 게시글 상세 → 검색창과 동일 디자인 재사용
- **`otherschool` 광고 제거**: 스코프 자체에서 삭제
- **Tip 트래킹 없음**: 광고 있으면 Tip 자체를 아예 안 씀 (임프레션 구분 불필요)
- **다크모드 QA 제외**: 후속 스프린트로 이관

---

## 0. API 계약 미확정 리스크 격리 (신규)

`/api/ads` 백엔드 라우트도, 응답 스펙도 아직 없음. 이 상태에서 나머지 작업(1~9단계)을 진행해도 나중에 스펙이 정해졌을 때 전면 수정을 피하기 위해 **어댑터 계층**을 하나 둔다.

- [x] `front/utils/adsApiAdapter.js` — `normalizeAdsResponse()` / `fetchAdsGrouped()`
- [ ] 이 파일 이외의 곳에서 raw 응답을 직접 파싱하지 않기로 규칙화 (`useAdSlots`, 화면 컴포넌트 포함)
- [ ] 알 수 없는 shape·placement가 오면 `__DEV__`에서 `console.warn`으로 표시 → 실제 스펙 붙었을 때 조용히 누락되는 것 방지
- [ ] 백엔드 스펙이 나중에 정해지면 `normalizeItem` / `extractRawList` **이 두 함수만** 수정하면 되도록 유지

> 이 계층 덕분에 1번(placement 상수) 이후 작업을 API 스펙 확정 없이 그대로 진행해도 안전하다.

---

## 1. 목표 / 원칙

- [ ] 슬롯 종류(`placement`)를 코드·API·디자인에서 동일한 enum/상수로 공유
- [ ] 종류마다 **전용 UI 컴포넌트**를 두고, 공통 로직만 훅/유틸로 공유
- [ ] API 없을 때 정책:
  - **송출 X**: 전면 모달, 스플래시, 등교중 배너
  - **Tip 송출**: 상단 고정 배너, 피드 중간 삽입(게시판/쪽지·개인우편/학교우편/알림)
- [ ] **Tip은 광고 데이터가 아예 없을 때만 노출**한다. 광고가 있으면 Tip은 그 슬롯에서 완전히 미사용 — 별도 임프레션 트래킹 불필요
- [ ] 다크모드는 이번 정책 범위에서 제외, 후속 스프린트에서 별도 처리

---

## 2. 슬롯 종류 정의 (placement)

| ID | 슬롯 | 노출 시점/위치 | API 없음 | 현재 코드 |
|----|------|----------------|----------|-----------|
| `launch_modal` | 앱 실행 시 하단 전면 모달 | 로그인 후 메인 진입 시 바텀시트 | **송출 X** | 없음 (신규) |
| `splash` | 로딩/스플래시 전면 이미지 | 앱 콜드스타트 스플래시 | **송출 X** | 정적 splash만 (신규) |
| `top_banner` | 상단 고정 배너 | 전체 게시판 · 검색창 상단 · **검색 결과 · 게시글 상세** (통합) | **Tip** | 검색홈 배너 재사용, 검색결과/상세는 이번에 편입 |
| `commute_banner` | 등교중 배너 | 등교중 UI 영역 | **송출 X** | 슬롯 인프라만 구현, **디자인은 보류** |
| `feed_board` | 게시판 피드 중간 삽입 | 전체/학교 게시판 리스트 N개마다 | **Tip** | `AdPlaceholder` |
| `feed_note_mail` | 쪽지·개인 우편함 피드 중간 | 쪽지/개인우편 리스트 | **Tip** | `ChatAdPlaceholder` |
| `feed_school_mail` | 학교 우편함 피드 중간 | 학교 우편함 그리드/리스트 | **Tip** | `MailboxAdPlaceholder` |
| `feed_alert` | 알림 피드 중간 삽입 | 알림 리스트 N개마다 | **Tip** | `NotificationAdPlaceholder` 재사용 (신규 placement) |

**제거됨**: `otherschool`(`SchoolAdPlaceholder`) — 이번 정책에서 완전히 삭제. 관련 컴포넌트/호출부 제거 대상.

- [ ] `constants/adPlacements.js`에 위 8개 ID·라벨·폴백 정책 상수화 (기존 `adSlots.config.js`의 camelCase와 네이밍 통일 필요 — snake_case로 맞출지 확정)
- [ ] `SchoolAdPlaceholder.jsx` 및 `otherschool.jsx` 내 호출부 삭제

---

## 3. API / 데이터 레이어

- [x] `adsApiAdapter.js`로 응답 정규화 (0단계 참고)
- [ ] `useAdSlots(placement)` — 화면/슬롯이 필요한 placement만 구독
- [ ] `injectAdSlots`의 `allowEmptySlots` 기본값을 placement 정책과 맞춤
  - Tip 허용 슬롯: 빈 슬롯 유지 → Tip
  - 송출 X 슬롯: 데이터 없으면 아이템 자체를 넣지 않음
- [ ] Tip은 광고 데이터가 `null`/`[]`일 때만 렌더. 광고 존재 시 Tip 분기 자체를 타지 않도록 공통 래퍼(`AdOrTip`)에서 처리
- [ ] 트래킹: impression/click은 **실제 광고에만** 붙임. Tip은 트래킹 대상 아님 (임프레션 지표 구분 불필요하므로 별도 로깅 없음)

---

## 4. 종류별 디자인 분리

### 4.1 `launch_modal`
- [ ] `LaunchAdModal` 신규
- [ ] 딤드 오버레이 + 하단 바텀시트, 이미지/제목/서브문구, CTA 「자세히 보기」, 「오늘 하루 보지 않기」
- [ ] API 없음/오늘 숨김 → 모달 자체 미마운트 (Tip 대체 금지)
- [ ] **게이트 우선순위**(5번 참고)에 따라 오프라인·강제 업데이트 상태에서는 아예 트리거하지 않음

### 4.2 `splash`
- [ ] `SplashAd` 신규 — 전면 이미지 + 최소 노출 시간/스킵 (선택)
- [ ] API 없음 → 기본 스플래시만
- [ ] 로드 지연 시 타임아웃 후 기본 스플래시로 진행 (무한 대기 금지)

### 4.3 `top_banner` (검색결과 · 상세 통합)
- [ ] `TopAdBanner` 컴포넌트 — 가로 배너 레이아웃
- [ ] 적용 화면: `boardAll` 상단, `searchscreen` 상단, `SearchResult`, `boardDetail` 하단
- [ ] **디자인은 검색창(`searchscreen`) 배너와 완전히 동일하게** — 별도 스타일 만들지 않고 컴포넌트 재사용
- [ ] API 없음 → Tip 배너 (`variant="topBanner"`)
- [ ] 기존 `boarddetailADplaceholder` / `SearchAdPlaceholder` 호출부를 `TopAdBanner`로 교체

### 4.4 `commute_banner` — 인프라만 우선 구현
- [ ] 슬롯 자리(마운트 포인트)만 헤더 컴포넌트에 마련
- [ ] `CommuteAdBanner`는 **최소 뼈대 컴포넌트**로만 생성 (실제 디자인 미정 — 임시로 텍스트만 출력하거나 `return null`)
- [ ] API 없음 → 송출 X (기존 등교 인디케이터만 유지)
- [ ] 등교 시간대/완료 상태와 광고 노출 조건 AND 처리
- [ ] **디자인 확정은 별도 티켓으로 분리** — 이번 스프린트 완료 조건에서 제외

### 4.5 `feed_board` / `feed_note_mail` / `feed_school_mail`
- [ ] 기존 컴포넌트 유지, placement 이름표만 통일
- [ ] 삽입 간격(`every`) placement 상수로 분리

### 4.6 `feed_alert` (신규)
- [ ] `NotificationAdPlaceholder`를 `feed_alert` placement로 정식 편입
- [ ] Tip variant `alert` 추가
- [ ] 기존 삽입 로직(every 5)은 유지, placement 이름표만 부여

---

## 5. 앱 시작 시 전면 게이트 우선순위 (신규)

콜드스타트 시 전면을 가릴 수 있는 요소가 3개(오프라인 게이트 / 강제 업데이트 게이트 / 광고 모달)로 늘어남에 따라 순서를 명시적으로 고정한다.

```
SafeAreaProvider
  └─ OfflineGate            ← 1순위
       └─ ForceUpdateGate   ← 2순위
            └─ LaunchAdModal 트리거 지점  ← 3순위
                 └─ 나머지 앱
```

- [ ] 오프라인 상태에서는 강제 업데이트 체크·광고 모달 모두 트리거하지 않음
- [ ] 온라인이지만 강제 업데이트 필요 시 광고 모달 트리거하지 않음
- [ ] 위 두 게이트를 모두 통과했을 때만 `launch_modal` 노출 조건(오늘 하루 보지 않기 등) 평가

---

## 6. 파일 / 구조

```
front/
  utils/adsApiAdapter.js             # NEW — API 응답 정규화 (0단계)
  constants/adPlacements.js          # placement enum + fallback policy
  hooks/useAdSlots.js                # placement 인자 / 그룹핑
  components/ads/
    TipPlaceholder.jsx               # variant 확장 (topBanner, alert 등)
    LaunchAdModal.jsx                # NEW
    SplashAd.jsx                     # NEW
    TopAdBanner.jsx                  # NEW (검색결과/상세 통합)
    CommuteAdBanner.jsx              # NEW — 뼈대만, 디자인 보류
  src/screens/ad/
    AdPlaceholder.jsx                # feed_board
    ChatAdPlaceholder.jsx            # feed_note_mail
    MailboxAdPlaceholder.jsx         # feed_school_mail
    NotificationAdPlaceholder.jsx    # feed_alert (기존 파일 재사용)
  styles/ad.style.js                 # placement별 스타일 블록 분리

# 삭제 대상
front/components/.../SchoolAdPlaceholder.jsx   # otherschool 광고 제거
```

---

## 7. 화면별 연결 체크

- [ ] 앱 루트 → `OfflineGate` → `ForceUpdateGate` → `launch_modal` (5번 순서 고정)
- [ ] 스플래시 부트스트랩 → `splash`
- [ ] `boardAll` → `top_banner` + `feed_board`
- [ ] `searchscreen` → `top_banner`
- [ ] `SearchResult` → `top_banner` (검색창과 동일 디자인)
- [ ] `boardDetail` → `top_banner` (검색창과 동일 디자인)
- [ ] `schoolBoardAll` → `feed_board`
- [ ] 헤더(`CommuteHeaderIndicator` 주변) → `commute_banner` (인프라만)
- [ ] `Message.jsx` → `feed_note_mail`
- [ ] `schoolMailbox.jsx` → `feed_school_mail`
- [ ] `notificationscreen.jsx` → `feed_alert`
- [ ] `otherschool.jsx` → 광고 관련 코드 제거

---

## 8. 구현 순서

1. [x] `adsApiAdapter.js` 적용 (0단계)
2. [x] placement 상수 + 폴백 헬퍼 (`feed_alert` 포함, `otherschool` 제외)
3. [x] `useAdSlots` / `fetchAdsGrouped` 연결
4. [x] 기존 피드 슬롯(`feed_board`/`feed_note_mail`/`feed_school_mail`/`feed_alert`)에 placement 태깅 + 폴백 가드 정리
5. [x] `top_banner` UI + 검색결과/상세 통합 연결
6. [x] `OfflineGate → ForceUpdateGate → LaunchAdModal` 순서로 `launch_modal` 구현
7. [x] `splash` 광고 레이어 + 타임아웃
8. [x] `commute_banner` 슬롯 인프라만 구현 (디자인은 별도 티켓)
9. [x] `otherschool` 광고 코드 제거
10. [ ] QA (다크모드 제외)

---

## 9. QA 체크리스트

- [ ] 각 placement에 광고 payload 있을 때 전용 디자인으로만 노출, Tip 안 섞임
- [ ] hide 정책 3종(`launch_modal`/`splash`/`commute_banner`): 빈 화면/기본 UI만, Tip·빈 슬롯 잔상 없음
- [ ] tip 정책 슬롯: API 실패·빈 배열 모두 Tip, 광고 있으면 Tip 완전히 미노출
- [ ] `launch_modal` 「오늘 하루 보지 않기」 다음날 재노출
- [ ] 스플래시 타임아웃 시 앱 진입 막히지 않음
- [ ] 등교 배너: 등교 비노출 시간대에는 광고도 비노출
- [ ] `top_banner`: 검색결과/상세에서 검색창과 시각적으로 동일한지 확인
- [ ] `feed_alert` 삽입 간격·키 중복 없음
- [ ] 오프라인 → 강제 업데이트 → 광고 모달 순서대로만 뜨는지 (동시 노출 없음)
- [ ] `otherschool` 화면에 광고 잔재 없는지
- [ ] ~~다크모드~~ — 후속 스프린트로 이관, 이번 QA 범위 아님

---

## 10. 남은 열린 질문

- [ ] `adsApiAdapter.js`가 임시로 커버 중 — 백엔드 스펙 확정 시 `normalizeItem`/`extractRawList`만 교체
- [ ] `commute_banner` 최종 디자인 — 별도 티켓, 이번 스프린트 완료 조건 아님
- [ ] `feed_alert`의 Tip variant 문구를 알림 톤에 맞게 새로 쓸지, 기존 18개 재사용할지
