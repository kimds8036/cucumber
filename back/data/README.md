# 학교 데이터 (1년치 JSON)

## 파일 위치

- **기본 경로**: `back/data/schools.json`
- 매년 공공 API 등에서 받은 학교 목록 JSON을 이 경로에 넣고 시드를 실행하면 됩니다.

## JSON 형식

배열 또는 `{ "data": [...] }` 형태 모두 가능합니다.  
각 항목은 아래 **한글 키**를 사용하면 됩니다 (시드 스크립트가 영어 컬럼으로 매핑합니다).

| JSON 키(한글) | DB 컬럼(영어) |
|---------------|----------------|
| 학교ID | external_id |
| 학교명 | name |
| 학교급구분 | school_level, school_type |
| 설립일자 | founded_date |
| 설립형태 | foundation_type |
| 본교분교구분 | main_branch |
| 운영상태 | operation_status |
| 소재지지번주소 | address_lot |
| 소재지도로명주소 | address |
| 시도교육청명 | region |
| 위도 | latitude |
| 경도 | longitude |

사용하지 않는 필드(시도교육청코드, 교육지원청코드, 교육지원청명, 생성일자, 변경일자, 데이터기준일자, 제공기관코드, 제공기관명)는 넣지 않아도 됩니다.

## 실행

```bash
cd back
npm run seed:schools
```

다른 파일 경로 지정:

```bash
npm run seed:schools -- ./경로/schools.json
# 또는
SCHOOLS_JSON_PATH=./my.json npm run seed:schools
```

## 매년 자동화 (권장)

데이터가 1년 유효하므로, 매년 한 번 시드를 돌리면 됩니다.

### 1) 수동 실행 (가장 단순)

매년 새 JSON을 받으면 `back/data/schools.json`을 덮어쓴 뒤:

```bash
cd back && npm run seed:schools
```

### 2) Docker + 호스트 cron (같은 서버에서 백엔드가 Docker로 돌 때)

- 호스트에서 매년 지정한 날에 `schools.json`을 받아 두고,
- 같은 머신의 백엔드 컨테이너 안에서 시드만 실행하고 싶다면:

```bash
# 예: 매년 1월 1일 02:00 (crontab -e)
0 2 1 1 * /path/to/cucumber/back/scripts/seed-schools-yearly.sh
```

`back/scripts/seed-schools-yearly.sh` 예시:

```bash
#!/bin/bash
cd /path/to/cucumber/back
# (선택) 새 JSON 다운로드 후 data/schools.json 덮어쓰기
node src/db/seed-schools-from-json.js
```

### 3) Docker Compose + 볼륨으로 JSON 공유

JSON 파일을 볼륨으로 마운트해 두고, 같은 명령을 컨테이너에서 실행:

```yaml
# docker-compose.yml 예시 (기존 db 서비스에 백엔드 추가 시)
volumes:
  - ./back/data:/app/data   # 호스트 back/data → 컨테이너 /app/data
```

컨테이너 안에서:

```bash
SCHOOLS_JSON_PATH=/app/data/schools.json node src/db/seed-schools-from-json.js
```

정리하면: **기본은 매년 `schools.json` 갱신 후 `npm run seed:schools` 한 번 실행**으로 충분하고, 필요하면 cron 또는 스크립트로 위처럼 자동화하면 됩니다.
