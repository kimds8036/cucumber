/**
 * merged_schools_final.json(배열) 기반으로 schools 테이블 업서트.
 *
 * 사용:
 *  - cd back
 *  - npm run seed:schools
 *  - (옵션) node src/db/seed-schools-from-json.js "C:\cucumber\back\data\merged_schools_final.json"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const defaultJsonPath = path.join(__dirname, "../../data/merged_schools_final.json");
const jsonPath = process.argv[2] ?? defaultJsonPath;

function yyyymmddToDate(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!/^\d{8}$/.test(s)) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}-${m}-${d}`;
}

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return null;
}

function sanitizeNonStandardJson(raw) {
  // JSON.parse는 NaN/Infinity 등을 허용하지 않음.
  // 값 위치에 등장하는 NaN/Infinity/-Infinity를 null로 치환한다.
  // (문자열 내부는 이미 따옴표로 감싸져 있으므로 대상이 아님)
  return raw
    .replace(/:\s*NaN(\s*[,}\]])/g, ": null$1")
    .replace(/:\s*Infinity(\s*[,}\]])/g, ": null$1")
    .replace(/:\s*-Infinity(\s*[,}\]])/g, ": null$1");
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || "cucumber",
    password: process.env.DB_PASSWORD || "cucumber0425",
    database: process.env.DB_NAME || "cucumber",
    charset: "utf8mb4",
  });

  try {
    const raw = await fs.readFile(jsonPath, "utf8");
    const items = JSON.parse(sanitizeNonStandardJson(raw));

    if (!Array.isArray(items)) {
      throw new Error("JSON 최상위가 배열이 아닙니다.");
    }

    const totalInJson = items.length;
    let skippedNoSchoolId = 0;
    const uniqueSchoolIdsInJson = new Set();

    const sql = `
      INSERT INTO schools (
        school_id, name, address, school_type, region,
        total_students, total_posts,
        edu_office_code, edu_office_name, admin_standard_code, jurisdiction_org_name,
        road_address, road_address_detail, phone, homepage_url, coed_type, hs_general_type,
        anniversary_date, modified_date,
        school_level, founded_date, foundation_type, main_branch, operation_status,
        address_lot, latitude, longitude
      )
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        address = VALUES(address),
        school_type = VALUES(school_type),
        region = VALUES(region),
        edu_office_code = VALUES(edu_office_code),
        edu_office_name = VALUES(edu_office_name),
        admin_standard_code = VALUES(admin_standard_code),
        jurisdiction_org_name = VALUES(jurisdiction_org_name),
        road_address = VALUES(road_address),
        road_address_detail = VALUES(road_address_detail),
        phone = VALUES(phone),
        homepage_url = VALUES(homepage_url),
        coed_type = VALUES(coed_type),
        hs_general_type = VALUES(hs_general_type),
        anniversary_date = VALUES(anniversary_date),
        modified_date = VALUES(modified_date),
        school_level = VALUES(school_level),
        founded_date = VALUES(founded_date),
        foundation_type = VALUES(foundation_type),
        main_branch = VALUES(main_branch),
        operation_status = VALUES(operation_status),
        address_lot = VALUES(address_lot),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude)
    `;

    await connection.beginTransaction();

    let upsertAttempted = 0;
    for (const obj of items) {
      const schoolId = cleanString(pick(obj, "학교ID", "school_id", "SCHOOL_ID"));
      if (!schoolId) {
        skippedNoSchoolId += 1;
        continue;
      }
      uniqueSchoolIdsInJson.add(schoolId);

      const name = cleanString(pick(obj, "학교명", "name"));
      const addr1 = cleanString(pick(obj, "도로명주소", "address"));
      const addr2 = cleanString(pick(obj, "도로명상세주소", "address_detail"));
      const address = cleanString([addr1, addr2].filter(Boolean).join(" "));

      const region = cleanString(pick(obj, "시도명", "region"));
      const schoolTypeRaw = cleanString(pick(obj, "고등학교구분명", "school_type"));
      const schoolType = schoolTypeRaw && schoolTypeRaw !== "  " ? schoolTypeRaw : null;

      const eduOfficeCode = cleanString(pick(obj, "시도교육청코드", "edu_office_code"));
      const eduOfficeName = cleanString(pick(obj, "시도교육청명", "edu_office_name"));
      const adminStandardCode = cleanString(pick(obj, "행정표준코드", "admin_standard_code"));
      const jurisdictionOrgName = cleanString(pick(obj, "관할조직명", "jurisdiction_org_name"));
      const roadAddress = cleanString(pick(obj, "도로명주소", "road_address"));
      const roadAddressDetail = cleanString(pick(obj, "도로명상세주소", "road_address_detail"));
      const phone = cleanString(pick(obj, "전화번호", "phone"));
      const homepageUrl = cleanString(pick(obj, "홈페이지주소", "homepage_url"));
      const coedType = cleanString(pick(obj, "남녀공학구분명", "coed_type"));
      const hsGeneralTypeRaw = cleanString(
        pick(obj, "고등학교일반전문구분명", "hs_general_type")
      );
      const hsGeneralType = hsGeneralTypeRaw && hsGeneralTypeRaw !== "  " ? hsGeneralTypeRaw : null;
      const anniversaryDate = yyyymmddToDate(pick(obj, "개교기념일", "anniversary_date"));
      const modifiedDate = yyyymmddToDate(pick(obj, "수정일자", "modified_date"));

      const schoolLevel = cleanString(pick(obj, "학교종류명", "school_level"));
      const foundedDate = yyyymmddToDate(pick(obj, "설립일자", "founded_date"));
      const foundationType = cleanString(pick(obj, "설립명", "foundation_type"));
      const mainBranch = cleanString(pick(obj, "본교분교구분명", "main_branch"));
      const operationStatus = cleanString(pick(obj, "운영상태", "운영상태명", "operation_status"));
      const addressLot = cleanString(pick(obj, "소재지지번주소", "address_lot"));

      const latitude = pick(obj, "위도", "latitude");
      const longitude = pick(obj, "경도", "longitude");

      await connection.execute(sql, [
        schoolId,
        name ?? schoolId,
        address,
        schoolType,
        region,
        eduOfficeCode,
        eduOfficeName,
        adminStandardCode,
        jurisdictionOrgName,
        roadAddress,
        roadAddressDetail,
        phone,
        homepageUrl,
        coedType,
        hsGeneralType,
        anniversaryDate,
        modifiedDate,
        schoolLevel,
        foundedDate,
        foundationType,
        mainBranch,
        operationStatus,
        addressLot,
        latitude ?? null,
        longitude ?? null,
      ]);
      upsertAttempted += 1;
    }

    await connection.commit();

    const [[countRow]] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM schools`
    );
    const dbCount = Number(countRow?.cnt ?? 0);

    console.log(
      [
        `✅ schools 시드 완료 (소스: ${jsonPath})`,
        `- JSON 총 항목: ${totalInJson}`,
        `- 학교ID 없음 스킵: ${skippedNoSchoolId}`,
        `- JSON 내 고유 school_id: ${uniqueSchoolIdsInJson.size}`,
        `- 업서트 시도: ${upsertAttempted}`,
        `- DB schools 총 행수: ${dbCount}`,
      ].join("\n")
    );
  } catch (err) {
    await connection.rollback();
    console.error("❌ schools 시드 오류:", err?.message ?? String(err));
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();

