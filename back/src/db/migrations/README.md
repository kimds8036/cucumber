# 데이터베이스 마이그레이션

## 구조 (2026-08-31 스쿼시)

| 경로 | 설명 |
|------|------|
| `001_init.sql` | **현재 전체 스키마** (002~006 · admin FK · mail FK · cron · ocr 제거 포함) |
| `archive/pre-squash/` | 2026-08 1차 스쿼시 이전 001~059 SQL (참고용, 실행 안 함) |
| `archive/incremental-pre-squash-v2/` | 2차 스쿼시 이전 증분 002~006 (참고용, 실행 안 함) |
| `007_developer_feedback_hall_of_fame.sql` | 회초리·명예의 전당·제보 묶음 (008~011 통합) |
| `008_announcements.sql` | 고객지원 공지사항 |
| `009_drop_users_graduation_year.sql` | `users.graduation_year` 컬럼 제거 |
| `archive/2026-09-squash/` | 2026-09 스쿼시 이전 008~011 SQL (참고용) |

`migrate.js`는 `schema_migrations` 테이블로 **이미 적용된 파일만 스킵**합니다.

**기존 DB (001~005 적용됨):** `migrate` 시 `repairSchemaNormalizationIfNeeded`가 레거시 컬럼(`answered_by` 등)을 자동 보정합니다.

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

1. `007_설명.sql` 형식으로 `migrations/`에 추가 (001 다음 번호)
2. `npm run migrate` — 한 번만 실행되고 `schema_migrations`에 기록됨

### 법적 문서 슬러그 (`legal_documents`)

| slug | 앱 화면 |
|------|---------|
| `terms_of_service` | 서비스 이용약관 |
| `privacy_policy` | 개인정보 처리방침 |
| `community_guide` | 커뮤니티 가이드 |
| `youth_protection_policy` | 청소년 보호정책 |
| `open_source_licenses` | 오픈소스 라이선스 |

시드 본문: `back/src/db/legal/*.md` (`001_init` 적용 시 `seedLegalDocuments` 실행)

## 스쿼시 배포 체크리스트 (기존 DB)

1. **develop**: `npm run migrate:develop` (정규화 repair 자동)
2. **production**: Railway 배포 시 `migrate` → repair 자동
3. 이미 풀 스키마인 DB: `npm run db:squash-baseline -- --all` (이력만 동기화)
4. 이후 `migrate`는 `001_init.sql`만 신규 DB에 적용

### 자동 베이스라인 (`migrate.js`)

기존 데이터가 있는 DB에 스쿼시 코드를 처음 배포할 때, `users` + `admin_stats_snapshots`가 있으면 archive 이력 + `001_init.sql`을 `schema_migrations`에 자동 기록합니다. **DDL은 실행하지 않습니다.**

## 006 정규화 요약 (001_init에 반영됨)

- P0: `answered_by` / `reviewed_by` → `*_admin_id` + FK `admin_users`
- P1: `personal_mails` 중복 FK 정리, `personal_mail_rooms` FK 추가
- P2: `user_devices` `(user_id, device_id)` UNIQUE
- P3: `ocr_verifications` 테이블 제거

## 주의

- `001_init.sql` 수정 시 checksum이 바뀌지만, 이미 `schema_migrations`에 있으면 재적용되지 않습니다.
- 스키마를 바꿀 때는 **새 번호 파일**(`007_...sql`)을 추가하세요.
