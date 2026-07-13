# 데이터베이스 마이그레이션

## 구조 (스쿼시 후)

| 경로 | 설명 |
|------|------|
| `001_init.sql` | **현재 전체 스키마** (신규 DB용 단일 파일) |
| `archive/pre-squash/` | 스쿼시 이전 001~059 SQL (참고용, 실행 안 함) |

`migrate.js`는 `schema_migrations` 테이블로 **이미 적용된 파일만 스킵**합니다.

## 명령어

```bash
npm run migrate                  # RAILWAY_TARGET 기준
npm run migrate:develop
npm run migrate:production
npm run migrate:all

# 스키마 파일 재생성 (운영 DB 덤프 — Railway TCP 프록시 또는 터널 필요)
npm run db:generate-init -- --target=develop

# archive 재생 (로컬 Docker MySQL)
npm run db:build-init

# 기존 DB 이력 동기화 (DDL 실행 없음, 환경당 1회)
npm run db:squash-baseline -- --target=develop
npm run db:squash-baseline -- --target=production
npm run db:squash-baseline -- --all
```

## 신규 마이그레이션 추가

1. `002_설명.sql` 형식으로 `migrations/`에 추가 (001 다음 번호)
2. `npm run migrate` — 한 번만 실행되고 `schema_migrations`에 기록됨

## 스쿼시 배포 체크리스트 (기존 DB)

1. **develop**: 배포 전 `npm run db:squash-baseline -- --target=develop` (또는 배포 시 자동 — 아래 참고)
2. **production**: Railway 내부 네트워크에서 첫 `migrate` 시 **자동 베이스라인** (`users` 테이블 있고 `001_init.sql` 미기록이면 DDL 없이 이력만 기록)
3. 수동 실행: `npm run db:squash-baseline -- --all`
4. 이후 `migrate`는 적용된 파일을 재실행하지 않음

### 자동 베이스라인 (`migrate.js`)

기존 데이터가 있는 DB에 스쿼시 코드를 처음 배포할 때, `users` 테이블이 있으면 `001_init.sql` 및 archive 65개 파일을 `schema_migrations`에 자동 기록합니다. **DDL은 실행하지 않습니다.**

## 주의

- `001_init.sql` 수정 시 checksum이 바뀌지만, 이미 `schema_migrations`에 있으면 재적용되지 않습니다.
- 스키마를 바꿀 때는 **새 번호 파일**(`002_...sql`)을 추가하세요.
