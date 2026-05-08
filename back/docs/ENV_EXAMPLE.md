# 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cucumber_db

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

## 중요 사항

- `JWT_SECRET`: 프로덕션 환경에서는 반드시 강력한 랜덤 문자열로 변경하세요
- `DB_PASSWORD`: 실제 MySQL 비밀번호로 변경하세요
- `.env` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 추가됨)
