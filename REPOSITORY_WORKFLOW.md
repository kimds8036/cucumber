# Cucumber 레포 작업 규칙

팀·에이전트가 동일한 흐름으로 작업·배포할 수 있도록 정리한 문서입니다.

---

## Railway 환경

| 환경 | 용도 | API 베이스 URL (기본) |
|------|------|------------------------|
| **Develop** | 개발·스테이징·내부 테스트 | `cucumber-develop` (Railway) |
| **Production** | 스토어·실사용자 | `cucumber-production` (Railway) |

- 프론트는 `APP_ENV` / EAS 빌드 프로필 / `EXPO_PUBLIC_API_URL`로 어느 Railway를 바라볼지 결정합니다.  
  자세한 설정은 `front/config/apiEnv.js`, `front/eas.json`, `front/.env.development` · `.env.production`을 참고하세요.
- **develop 브랜치**에서 로컬 앱을 띄우면 기본적으로 **develop Railway**에 붙습니다.
- **production 브랜치** 또는 `APP_ENV=production` / EAS `production` 프로필 빌드는 **production Railway**를 사용합니다.

---

## Git 브랜치 전략

| 브랜치 | 역할 |
|--------|------|
| **`feat/front-init`** | 프론트엔드 전용 작업·PR·커밋 |
| **`feat/back-init`** | 백엔드 전용 작업·PR·커밋 |
| **`develop`** | 프론트 + 백 변경을 **합쳐서** 통합·연동 테스트하는 브랜치 |
| **`production`** | 스토어 배포·운영 반영 전 **최종 확인**이 끝난 내용만 올리는 브랜치 |

### 권장 흐름

1. **프론트만** 수정 → `feat/front-init`에서 작업 후 푸시  
2. **백만** 수정 → `feat/back-init`에서 작업 후 푸시  
3. 양쪽이 맞물리는지 보려면 → `develop`에 반영 (머지 또는 필요 시 **체리픽** 등 선택)  
4. **최종 동작·회귀 확인**이 끝난 뒤 → `production`에만 반영 (가능하면 production 전용 커밋·체리픽으로 최소 단위 유지)

### 주의

- `develop` ↔ `production`을 **무분별하게 큰 머지**만 반복하면 diff·데이터·설정이 한꺼번에 바뀌어 추적이 어려워질 수 있습니다.  
  필요하면 **작은 단위 PR/커밋** 또는 **체리픽**으로 나누는 것을 권장합니다.
- 민감 파일(`.env`, `credentials.json`, 키스토어 등)은 **커밋하지 않습니다.** (`.gitignore` 준수)

---

## 로컬에서 화면 테스트할 때 (develop 기준)

```powershell
git checkout develop
git pull origin develop
cd front
npm install   # 최초 또는 의존성 변경 시
npm start
# 또는 안드로이드: npm run android
```

- API는 위 표에 따라 **develop Railway**가 기본입니다.  
- 백엔드 변경분을 로컬에서 같이 띄워야 할 때는 `back` 쪽 README·`.env`를 따릅니다.

---

## 관련 경로

- 프론트: `front/`
- 백엔드: `back/`
- 관리자 웹(신고 등): `back`의 `/admin` · `admin/Focux admin.html` 등 기존 구조 유지

---

이 문서는 레포 운영 규칙의 요약입니다. 세부 배포·EAS·Play 스토어 절차는 각 폴더 README나 `back/docs`를 함께 참고하세요.
