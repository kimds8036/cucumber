-- 기존 DB용: 학교 JSON 시드 컬럼 추가 (001에서 이미 있으면 1060/1061 스킵)
ALTER TABLE schools ADD COLUMN school_level VARCHAR(50) NULL COMMENT '학교급구분' AFTER region;
ALTER TABLE schools ADD COLUMN founded_date DATE NULL COMMENT '설립일자' AFTER school_level;
ALTER TABLE schools ADD COLUMN foundation_type VARCHAR(50) NULL COMMENT '설립형태' AFTER founded_date;
ALTER TABLE schools ADD COLUMN main_branch VARCHAR(20) NULL COMMENT '본교분교구분' AFTER foundation_type;
ALTER TABLE schools ADD COLUMN operation_status VARCHAR(20) NULL COMMENT '운영상태' AFTER main_branch;
ALTER TABLE schools ADD COLUMN address_lot TEXT NULL COMMENT '소재지지번주소' AFTER operation_status;
ALTER TABLE schools ADD COLUMN latitude DECIMAL(10,7) NULL COMMENT '위도' AFTER total_posts;
ALTER TABLE schools ADD COLUMN longitude DECIMAL(10,7) NULL COMMENT '경도' AFTER latitude;

-- merged_schools_final.json 주요 원본 필드 저장용 (재실행 시 1060 스킵)
ALTER TABLE schools ADD COLUMN edu_office_code VARCHAR(20) NULL COMMENT '시도교육청코드' AFTER total_posts;
ALTER TABLE schools ADD COLUMN edu_office_name VARCHAR(100) NULL COMMENT '시도교육청명' AFTER edu_office_code;
ALTER TABLE schools ADD COLUMN admin_standard_code VARCHAR(50) NULL COMMENT '행정표준코드' AFTER edu_office_name;
ALTER TABLE schools ADD COLUMN jurisdiction_org_name VARCHAR(150) NULL COMMENT '관할조직명' AFTER admin_standard_code;
ALTER TABLE schools ADD COLUMN road_address TEXT NULL COMMENT '도로명주소' AFTER jurisdiction_org_name;
ALTER TABLE schools ADD COLUMN road_address_detail TEXT NULL COMMENT '도로명상세주소' AFTER road_address;
ALTER TABLE schools ADD COLUMN phone VARCHAR(30) NULL COMMENT '전화번호' AFTER road_address_detail;
ALTER TABLE schools ADD COLUMN homepage_url VARCHAR(255) NULL COMMENT '홈페이지주소' AFTER phone;
ALTER TABLE schools ADD COLUMN coed_type VARCHAR(50) NULL COMMENT '남녀공학구분명' AFTER homepage_url;
ALTER TABLE schools ADD COLUMN hs_general_type VARCHAR(50) NULL COMMENT '고등학교일반전문구분명' AFTER coed_type;
ALTER TABLE schools ADD COLUMN anniversary_date DATE NULL COMMENT '개교기념일' AFTER hs_general_type;
ALTER TABLE schools ADD COLUMN modified_date DATE NULL COMMENT '수정일자' AFTER anniversary_date;
