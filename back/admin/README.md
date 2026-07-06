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
        ├── 03-reports-dashboard.js
        ├── 04-appeals-users-logs.js
        ├── 05-inquiries.js
        └── 06-bootstrap.js
```

조립: `back/src/admin/renderAdminPage.js`  
경로 설정: `ADMIN_BASE_PATH` (`back/src/config/adminPath.js`)
