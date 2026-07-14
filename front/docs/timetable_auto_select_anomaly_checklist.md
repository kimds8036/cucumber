# 시간표 자동선택 · 공휴일/시험 안내 · 편집/저장 흐름 구현 체크리스트

> 목표: **시간표 선택 화면**에서 **자동 선택** 시 API 응답에 공휴일/시험 정보가 있으면 확인 모달을 띄우고, **수정하기** → `edittimetable.jsx`, **저장하기** → 불러온 시간표를 마이페이지에 고정 표시. 편집 화면에서 저장 시 편집 결과와 함께 마이페이지로 이동.

---

## 1. 현재 동작 정리 (기준선)

- [ ] `front/src/screens/timetable/timetabelChoice.jsx`
  - 자동 선택 시 `/api/timetable` 조회 → `AsyncStorage` 저장 → **「시간표가 추가되었습니다」** 모달 → 확인 시 `Main(initialTab: 'mypage')` 이동
  - 공휴일/시험 여부 분기 **없음**
- [ ] `front/view/src/edittimetable.jsx`
  - 저장 시 `timetableCacheKey`로 `AsyncStorage` 저장
  - `returnToMypage: true`일 때만 마이페이지 이동 (현재 마이페이지·선택 화면에서 이 param **미전달**)
- [ ] `front/view/src/mypage.jsx`
  - `useFocusEffect`로 `AsyncStorage` 캐시 읽어 시간표 표시
  - 편집 진입: `EditTimetable`에 `returnToMypage` **미설정**

---

## 2. API · 데이터 계약

### 2-1. 백엔드 — 공휴일/시험 정보 노출

- [ ] `GET /api/timetable` 응답에 이상 셀(공휴일·시험) 메타 추가
  - 예시 필드:
    ```json
    {
      "success": true,
      "data": {
        "timetable": { "월-1": "수학", "화-3": "시험", ... },
        "subjects": ["수학", "영어", ...],
        "anomalies": {
          "hasHolidayOrExam": true,
          "items": [
            { "key": "화-3", "day": "화", "period": 3, "value": "시험", "type": "exam" }
          ]
        }
      }
    }
    ```
- [ ] NEIS row → 격자 변환 시 공휴일/시험 판별 유틸 추가 (`back/src/utils/timetableAnomaly.js` 등)
  - 판별 기준 초안 (프로젝트에서 확정):
    - 과목명에 `공휴일`, `휴업`, `방학`, `재량` 등 포함 → `holiday`
    - 과목명에 `시험`, `고사`, `중간`, `기말`, `수행평가` 등 포함 → `exam`
    - (선택) 해당 요일 전 교시가 비어 있고 특수 과목명만 있는 패턴
- [ ] `hasHolidayOrExam: false`이면 `anomalies` 생략 또는 빈 배열로 통일 (프론트 분기 단순화)
- [ ] 기존 `timetable` / `subjects` 필드는 **하위 호환** 유지

### 2-2. 프론트 — API 파싱

- [ ] `front/utils/timetableApi.js` (또는 `timetabelChoice` 내부 fetch 헬퍼)에서 `anomalies` 파싱
- [ ] `front/utils/timetableAnomaly.js`에 `hasTimetableAnomaly(data)` / `getAnomalySummary(data)` 헬퍼
  - 백엔드 `anomalies.hasHolidayOrExam` 우선 사용
  - (폴백) `timetable` 값 문자열로 클라이언트 단독 판별 — API 미배포 대비

---

## 3. UI — 공휴일/시험 확인 모달

- [ ] `front/components/timetable/TimetableAnomalyConfirmModal.jsx` 신규 (또는 `AppPopupModal` 래퍼)
  - **본문**: `공휴일이 포함돼 있습니다 시간표를 수정하시겠습니까? 저장을 누르면 해당 시간표로 고정됩니다`
    - (선택) 시험만 있을 때 문구 분기: `시험이 포함돼 있습니다 …` / 둘 다: `공휴일·시험이 포함돼 있습니다 …`
  - **버튼 2개**
    - `수정하기` (secondary)
    - `저장하기` (primary)
  - 배경 탭 닫기: **비활성** (`dismissOnBackdrop={false}`) — 의도적 선택 유도
- [ ] 기존 「시간표가 추가되었습니다」 모달과 역할 분리
  - 이상 없음 → 기존 완료 모달 유지
  - 이상 있음 → **이 모달만** 표시 (완료 모달과 중복 X)

---

## 4. 시간표 선택 화면 — 자동 선택 분기

파일: `front/src/screens/timetable/timetabelChoice.jsx`

### 4-1. 상태 · 데이터 보관

- [ ] 자동 선택 API 응답을 모달/action 핸들러에서 쓸 수 있도록 state 보관
  - `pendingAutoTimetable` — 저장 대기 중 시간표 객체
  - `pendingAutoAnomalies` — (선택) 상세 이상 목록
  - `showAnomalyConfirmModal` — 모달 visible

### 4-2. `fetchAndApplyAutoTimetable` 수정

- [ ] 시간표 데이터 없음 → 기존 `Alert` 유지
- [ ] 시간표 있음 + **`hasHolidayOrExam === true`**
  - [ ] **즉시 AsyncStorage 저장하지 않음** (사용자 선택 대기)
  - [ ] `pendingAutoTimetable`에 timetable 저장
  - [ ] `showAnomalyConfirmModal = true`
- [ ] 시간표 있음 + **이상 없음**
  - [ ] 기존과 동일: AsyncStorage 저장 → 「시간표가 추가되었습니다」 모달

### 4-3. 모달 액션

#### 「수정하기」

- [ ] 모달 닫기
- [ ] `navigation.navigate('EditTimetable', {`
  - `existingTimetable: pendingAutoTimetable`
  - `timetableCacheKey: scopedTimetableCacheKey`
  - **`returnToMypage: true`**
  - `})`
- [ ] `pendingAutoTimetable` 초기화

#### 「저장하기」

- [ ] `AsyncStorage.setItem(scopedTimetableCacheKey, { ts, timetable: pendingAutoTimetable, clearedByUser: false })`
- [ ] (선택) 서버 고정 저장 `PUT /api/timetable` — 백엔드 override·DB 고정 정책과 맞추기
- [ ] 모달 닫기 + `navigation.navigate('Main', { initialTab: 'mypage' })`
- [ ] `pendingAutoTimetable` 초기화

---

## 5. 시간표 편집 화면 — 저장 후 마이페이지 이동

파일: `front/view/src/edittimetable.jsx`

- [ ] `handleSave` 완료 후 `returnToMypage === true`이면 `Main(initialTab: 'mypage')` — **이미 구현됨**, param 전달만 보장
- [ ] 자동선택 → 수정하기 경로에서 `returnToMypage: true` 전달 (§4-3)
- [ ] (권장) 마이페이지 연필(셀 편집) 진입 시에도 `returnToMypage: true` 전달  
  - 파일: `front/view/src/mypage.jsx` → `handleNavigateToTimetableCellEdit`

### 5-1. 저장 시 서버 동기화 (정책 확정 후)

- [ ] 로컬 `AsyncStorage`만 쓸지, `PUT /api/timetable`도 호출할지 결정
- [ ] 「저장하기」(선택 화면)와 「편집 후 저장」(편집 화면) **동일 저장 경로** 사용

---

## 6. 마이페이지 — 시간표 표시

파일: `front/view/src/mypage.jsx`

- [ ] `useFocusEffect` 캐시 읽기 로직 **변경 불필요** (AsyncStorage 키·스키마 동일 가정)
- [ ] 자동선택 「저장하기」 또는 편집 후 저장 → 포커스 시 `timetable` state 갱신 확인
- [ ] (선택) 시간표 고정 API 연동 시 서버 우선·캐시 폴백 정책 문서화

---

## 7. 네비게이션 · 화면 전환 검증

| 시나리오 | 기대 결과 |
|---------|----------|
| 자동선택 · 이상 없음 | 캐시 저장 → 완료 모달 → 마이페이지 |
| 자동선택 · 공휴일/시험 있음 → **저장하기** | 캐시 저장 → **바로** 마이페이지 (완료 모달 X) |
| 자동선택 · 공휴일/시험 있음 → **수정하기** | EditTimetable 진입 (불러온 시간표 prefill) |
| EditTimetable 저장 (`returnToMypage`) | 캐시 저장 → Alert 확인 → 마이페이지에 **편집본** 표시 |
| EditTimetable 뒤로가기 | 저장 없이 이전 화면 (선택 화면 또는 마이페이지) |

- [ ] 위 5가지 시나리오 수동 QA
- [ ] Android / iOS 각 1회
- [ ] 가이드 프리뷰 모드(`isGuidePreview`) 영향 없음 확인

---

## 8. 예외 · 엣지 케이스

- [ ] 자동선택 API 실패 → 기존 `Alert('불러오기 실패')` 유지
- [ ] 이상 모달 표시 중 뒤로가기 → 모달 닫기 + `pendingAutoTimetable` 폐기 (저장 안 됨)
- [ ] 수정하기 → 편집 → 저장 전 앱 종료 → 캐시 미반영 (기존 편집 화면과 동일)
- [ ] `timetableCacheKey` scope (사용자별 `@mypage_timetable_cache_v1:{userId}`) — 선택·편집·마이페이지 **동일 키** 사용
- [ ] 공휴일만 / 시험만 / 둘 다 — 안내 문구 분기 필요 여부 PO 확인

---

## 9. 파일 변경 목록 (예상)

| 구분 | 파일 | 작업 |
|------|------|------|
| BE | `back/src/utils/timetableAnomaly.js` | 공휴일/시험 판별 |
| BE | `back/src/routes/timetable.js` | GET 응답에 `anomalies` 추가 |
| FE util | `front/utils/timetableAnomaly.js` | 클라이언트 판별·파싱 |
| FE util | `front/utils/timetableApi.js` | API fetch 래퍼 (선택) |
| FE UI | `front/components/timetable/TimetableAnomalyConfirmModal.jsx` | 확인 모달 |
| FE screen | `front/src/screens/timetable/timetabelChoice.jsx` | 자동선택 분기·모달 연동 |
| FE screen | `front/view/src/edittimetable.jsx` | (param만) `returnToMypage` 경로 확인 |
| FE screen | `front/view/src/mypage.jsx` | 편집 진입 시 `returnToMypage: true` (권장) |

---

## 10. 구현 순서 (권장)

1. [ ] 백엔드 `anomalies` 필드 + 판별 유틸
2. [ ] 프론트 `timetableAnomaly` 헬퍼 + API 파싱
3. [ ] `TimetableAnomalyConfirmModal` UI
4. [ ] `timetabelChoice.jsx` 자동선택 분기 (핵심)
5. [ ] `EditTimetable` / `mypage` `returnToMypage` param 정리
6. [ ] §7 시나리오 QA

---

## 11. 완료 정의 (Definition of Done)

- [ ] 자동선택 시 API에 공휴일/시험 정보가 있으면 지정 문구 모달 표시
- [ ] **수정하기** → `edittimetable.jsx`에서 불러온 시간표로 편집 가능
- [ ] **저장하기** → 불러온 시간표 그대로 마이페이지에 표시
- [ ] 편집 화면 **저장** → 편집된 시간표와 함께 마이페이지 이동
- [ ] 이상 없는 자동선택은 기존 UX 유지
- [ ] 린트·기존 시간표 직접 선택 플로우 회귀 없음
