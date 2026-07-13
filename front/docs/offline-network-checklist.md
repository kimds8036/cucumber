# 네트워크 끊김 전면 화면 구현 체크리스트

오프라인일 때 **"네트워크 연결 상태를 확인해 주세요"** 전면 페이지를 띄우는 작업 가이드입니다.  
이 앱은 Expo + React Native이며, `ForceUpdateGate` / `LocationGate`처럼 **루트 트리 상단 게이트** 패턴을 쓰는 것이 맞습니다.

---

## 0. 목표 정리

- [ ] 네트워크가 끊기면 앱 전체를 가리는 전면 UI 표시
- [ ] 문구: **"네트워크 연결 상태를 확인해 주세요"** (필요 시 부제·CTA 추가)
- [ ] 연결이 복구되면 자동으로 원래 화면으로 복귀
- [ ] 로그인 전/후에도 동일하게 동작 (네비 스택 화면이 아닌 게이트)

---

## 1. 사전 확인 (현재 코드베이스)

- [ ] 전역 offline 화면이 **아직 없음** 확인
- [ ] `@react-native-community/netinfo` / `expo-network` **미설치** 확인
- [ ] 참고할 기존 패턴 확인
  - [ ] `front/components/common/ForceUpdateGate.jsx` — 전면 게이트 + 재시도
  - [ ] `front/components/common/AppErrorBoundary.jsx` — 동일 레이아웃
  - [ ] `front/App.js` — Provider / Gate 마운트 위치
- [ ] API 단건 실패 메시지(`userFacingError.js`)와 **역할 분리**
  - 단건 실패 → 토스트/인라인 안내
  - 기기 오프라인 → 전면 게이트

---

## 2. UX / 정책 결정

- [ ] **차단 범위**
  - [ ] 앱 전체 차단 (권장: OfflineGate)
  - [ ] 또는 상단 배너만 (약함 — 이번 요구와 다름)
- [ ] **표시 조건**
  - [ ] `isConnected === false` → 오프라인
  - [ ] `isInternetReachable === false` 도 오프라인으로 볼지 결정  
    (Wi‑Fi는 잡혀 있지만 인터넷이 없는 캡티브 포털 등)
  - [ ] `isInternetReachable === null`(아직 판정 전)은 **오프라인으로 치지 않기**
- [ ] **복구 시 동작**
  - [ ] 연결되면 자동으로 children 렌더 (권장)
  - [ ] "다시 시도" 버튼으로 NetInfo 재조회 (선택)
- [ ] **강제 업데이트 게이트와의 우선순위**
  - [ ] `ForceUpdateGate`가 먼저인지, Offline가 먼저인지 정하기  
    권장: `ForceUpdateGate` → `OfflineGate` → 나머지
- [ ] **개발 중 예외**
  - [ ] `__DEV__`에서도 실제 오프라인이면 보여줄지 / 무시할지 결정

---

## 3. 의존성 설치

- [ ] Expo 호환 버전으로 설치

```bash
cd front
npx expo install @react-native-community/netinfo
```

- [ ] `package.json`에 추가됐는지 확인
- [ ] 네이티브 모듈이므로 **dev-client 재빌드** 필요할 수 있음  
  (`expo start`만으로는 안 될 수 있음 → 새 네이티브 빌드)

---

## 4. 컴포넌트 설계

### 4-1. 파일 위치

- [ ] `front/components/common/OfflineGate.jsx` 생성  
  (`ForceUpdateGate.jsx` 옆에 두는 구성)

### 4-2. 동작 스펙

- [ ] 마운트 시 `NetInfo.fetch()`로 초기 상태 확인
- [ ] `NetInfo.addEventListener`로 상태 변화 구독
- [ ] 언마운트 시 구독 해제
- [ ] 오프라인이면 전면 UI, 온라인이면 `children` 렌더
- [ ] (선택) "다시 시도" → `NetInfo.fetch()` 후 상태 갱신

### 4-3. UI 스펙 (기존 게이트와 맞추기)

- [ ] `flex: 1`, 중앙 정렬
- [ ] 배경: `colors.background`
- [ ] 제목: `네트워크 연결 상태를 확인해 주세요`
- [ ] (선택) 부제: Wi‑Fi / 모바일 데이터 확인 안내
- [ ] (선택) CTA: `다시 시도` — `colors.primary`
- [ ] 폰트/색: `styles/colors`의 `fonts`, `textPrimary`, `textSecondary` 사용
- [ ] Safe Area 필요 시 `SafeAreaView` 또는 상위 `SafeAreaProvider`에 맡기기

### 4-4. 의사코드

```jsx
// OfflineGate.jsx (개념)
function OfflineGate({ children }) {
  const [online, setOnline] = useState(true); // 초기 true → 깜빡임 최소화

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      const reachable = state.isInternetReachable; // null이면 판정 보류
      setOnline(connected && reachable !== false);
    });
    return () => unsub();
  }, []);

  if (!online) return <OfflineScreen onRetry={...} />;
  return children;
}
```

---

## 5. App.js 연결

- [ ] `OfflineGate` import
- [ ] Provider 트리에 삽입 (권장 위치)

```
SafeAreaProvider
  └─ ForceUpdateGate
       └─ OfflineGate          ← 여기
            └─ KeyboardProvider
                 └─ AuthProvider …
                      └─ NavigationContainer
```

- [ ] 네비게이션 스택에 별도 라우트로 **넣지 않기**  
  (deep link / 로그인 플로우와 충돌 방지)
- [ ] 소켓·토스트 등보다 **위**에 두어 오프라인 시 하위 구독 부담 줄이기 (선택)

---

## 6. 엣지 케이스

- [ ] 앱 시작 직 잠깐 오프라인으로 보이는 **플리커** 방지  
  - 초기 state를 `true`(온라인 가정) 또는 `null`(로딩)으로 두고 정책 정하기
- [ ] iOS/Android에서 `isInternetReachable` 동작 차이 확인
- [ ] 비행기 모드 ON → 화면 표시 → OFF → 자동 복귀
- [ ] Wi‑Fi만 끊고 데이터는 살아 있는 경우
- [ ] 서버만 죽은 경우(기기 온라인) → **OfflineGate는 안 뜨는 것이 정상**  
  (그건 API 에러 / ForceUpdateGate error UI 영역)
- [ ] 오프라인 중 푸시 탭 → 복구 후 네비게이션이 깨지지 않는지

---

## 7. (선택) 훅으로 분리

- [ ] `front/hooks/useNetworkStatus.js` 추출
  - `isOnline`, `isOffline`, `refresh`
- [ ] 나중에 배너/특정 화면에서 재사용 가능하게

---

## 8. 테스트 체크리스트

### 실기기 / 에뮬레이터

- [ ] 비행기 모드 ON → 전면 문구 표시
- [ ] 비행기 모드 OFF → 자동으로 앱 복귀
- [ ] Wi‑Fi OFF + 데이터 OFF → 표시
- [ ] 앱 백그라운드에서 끊겼다가 포그라운드 복귀 시에도 반영
- [ ] 로그인 전 화면에서도 표시되는지
- [ ] 로그인 후 메인/채팅에서도 표시되는지
- [ ] "다시 시도" 동작 (넣은 경우)

### 회귀

- [ ] `ForceUpdateGate` (강제 업데이트 / 버전 체크 실패)와 겹칠 때 의도대로인지
- [ ] Socket 재연결이 온라인 복구 후 정상인지
- [ ] API 타임아웃 메시지가 오프라인 화면과 중복·충돌하지 않는지

---

## 9. 구현 순서 (짧게)

1. [ ] `npx expo install @react-native-community/netinfo`
2. [ ] (필요 시) dev-client 재빌드
3. [ ] `OfflineGate.jsx` 작성
4. [ ] `App.js`에 `ForceUpdateGate` 안쪽에 마운트
5. [ ] 비행기 모드로 실기기 검증
6. [ ] 플리커 / `isInternetReachable` null 처리 다듬기

---

## 10. 완료 기준

- [ ] 오프라인 시 전면으로 **"네트워크 연결 상태를 확인해 주세요"** 표시
- [ ] 온라인 복구 시 별도 새로고침 없이(또는 재시도 한 번으로) 정상 화면 복귀
- [ ] 네비 스택을 건드리지 않고 루트 게이트로 동작
- [ ] 기존 `ForceUpdateGate` / 에러 바운더리 UX와 톤이 맞음

---

## 참고 파일

| 용도 | 경로 |
|------|------|
| 루트 마운트 | `front/App.js` |
| 레이아웃 참고 | `front/components/common/ForceUpdateGate.jsx` |
| 에러 화면 참고 | `front/components/common/AppErrorBoundary.jsx` |
| API 단건 네트워크 문구 | `front/utils/userFacingError.js` |
| 신규 게이트 (예정) | `front/components/common/OfflineGate.jsx` |
