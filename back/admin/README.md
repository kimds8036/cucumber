# Admin UI (`back/admin/`)

서버가 `ADMIN_BASE_PATH` 아래에서 정적·HTML을 조립해 제공합니다.

```
admin/
├── index.html              # 셸 ({{SIDEBAR}}, {{TOPBAR}}, … 플레이스홀더)
├── login.html
├── partials/
│   ├── sidebar.html        # 사이드바 네비
│   ├── topbar.html         # 상단 바
│   ├── content.html        # 패널(대시보드·신고·문의 등)
│   └── dialogs.html        # 모달 다이얼로그
└── assets/
    ├── css/
    │   ├── admin.css
    │   └── login.css
    └── js/
        ├── login.js
        ├── 01-core.js              # 인증·API·네비·유틸
        ├── 02-student-ids.js
        ├── 02-certificates.js
        ├── 03-reports-dashboard.js
        ├── 04-appeals-users-logs.js
        ├── 05-inquiries.js
        ├── 06-bootstrap.js         # 패널 lazy-load 등록
        ├── 07-attendance.js
        ├── 08-emergency.js
        ├── 09-admin-accounts.js
        ├── 10-legal-documents.js
        ├── 11-manual-signup.js
        └── 12-hall-of-fame.js
```

조립: `back/src/admin/renderAdminPage.js`  
경로 설정: `ADMIN_BASE_PATH` (`back/src/config/adminPath.js`)  
API 베이스: `01-core.js`의 `api()` → **`/api/admin` + path** (예: `api('/hall-of-fame')`)

---

## 신규 관리자 메뉴·API 체크리스트

반복 실수 방지용. 상세·OTP·RBAC는 로컬 `docs/[완] 관리자_접속.md` 참고.

### 백엔드 (`back/src/routes/admin*.js`, `services/`)

| 항목 | 규칙 |
|------|------|
| 요청 검증 | `import { validate } from '../middleware/validate.js'` — **`validation.js` 아님** |
| 관리자 가드 | `requireAdminApi` + `isAdminUser(req.user.userId)` 패턴 유지 |
| 사용자 실명 | DB 컬럼은 `users.name_enc`. 조회 후 **`resolveUserName(row)`** (`userPii.service.js`). **`u.name` / `row.name` 사용 금지** |
| SQL `LIMIT`/`OFFSET` | 상한 clamp 후 **문자열 보간** (`LIMIT ${n} OFFSET ${o}`). `LIMIT ? OFFSET ?` 바인딩은 mysql2에서 실패 이력 있음 |
| 라우트 순서 | 고정 경로(`/developer-feedback`, `/resolve-user/:id`)를 **`/:id`보다 위에** 등록 |
| 마이그레이션 | 새 테이블은 `back/src/db/migrations/` 번호 순. develop·production **각각** 적용 확인 |

### 프론트 (`back/admin/`)

| 항목 | 규칙 |
|------|------|
| API 호출 | `api('/…')` — `/api/admin` 접두사 **붙이지 않음** |
| 패널 등록 | `content.html` 패널 div · `sidebar.html` nav · `01-core.js` `panels`/`canAccessPanel` · `06-bootstrap.js` lazy loader · `index.html` script 태그 |
| 오류 표시 | `loadXxxPanel`에서 `Promise.all` 실패 시 한 API만 깨져도 전체가 «불러오지 못했습니다» — 원인 메시지·서버 로그 확인 |

### 배포 후 확인

- Railway 로그: `[admin/…]` 또는 해당 라우트 `console.error` 태그
- develop DB에 해당 migration 적용 여부 (`developer_feedback`, `hall_of_fame_*` 등)
