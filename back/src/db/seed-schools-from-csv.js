/**
 * schools_merged.csv 기반 schools 테이블 정제+업서트.
 *
 * 사용:
 *  - cd back
 *  - npm run seed:schools
 *  - (옵션) node src/db/seed-schools-from-csv.js "C:\\y\\back\\src\\db\\schools_merged.csv"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const defaultCsvPath = path.join(__dirname, "schools_merged.csv");
const csvPath = process.argv[2] ?? defaultCsvPath;

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

function parseDecimal(v) {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function yyyymmddToDate(value) {
  const s = cleanString(value);
  if (!s) return null;
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function stripBom(v) {
  return String(v).replace(/^\uFEFF/, "");
}

function pickPreferredAddress(row) {
  const road = cleanString(row.road_address);
  const base = cleanString(row.address);
  const lot = cleanString(row.address_lot);
  const candidates = [road, base, lot].filter(Boolean);
  if (!candidates.length) {
    return { address: null, roadAddress: null };
  }
  // 중복 문자열 제거 후 우선순위 첫 값을 대표 주소로 사용
  const uniq = [...new Set(candidates)];
  return {
    address: uniq[0],
    roadAddress: road ?? uniq[0],
  };
}

function buildRow(rawRow) {
  const schoolId = cleanString(rawRow.school_id);
  if (!schoolId) return null;

  const { address, roadAddress } = pickPreferredAddress(rawRow);
  const modifiedDate = yyyymmddToDate(rawRow.modified_date);

  return {
    school_id: schoolId,
    name: cleanString(rawRow.name) ?? schoolId,
    address,
    school_type: cleanString(rawRow.school_type),
    region: cleanString(rawRow.region),
    edu_office_code: cleanString(rawRow.edu_office_code),
    edu_office_name: cleanString(rawRow.edu_office_name),
    admin_standard_code: cleanString(rawRow.admin_standard_code),
    jurisdiction_org_name: cleanString(rawRow.jurisdiction_org_name),
    road_address: roadAddress,
    road_address_detail: cleanString(rawRow.road_address_detail),
    phone: cleanString(rawRow.phone),
    homepage_url: cleanString(rawRow.homepage_url),
    coed_type: cleanString(rawRow.coed_type),
    hs_general_type: cleanString(rawRow.hs_general_type),
    anniversary_date: yyyymmddToDate(rawRow.anniversary_date),
    modified_date: modifiedDate,
    school_level: cleanString(rawRow.school_level),
    founded_date: yyyymmddToDate(rawRow.founded_date),
    foundation_type: cleanString(rawRow.foundation_type),
    main_branch: cleanString(rawRow.main_branch),
    operation_status: cleanString(rawRow.operation_status),
    address_lot: cleanString(rawRow.address_lot),
    latitude: parseDecimal(rawRow.latitude),
    longitude: parseDecimal(rawRow.longitude),
    _modified_date_cmp: modifiedDate ?? "0000-00-00",
  };
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
    const raw = await fs.readFile(csvPath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((v) => v.trimEnd())
      .filter((v) => v.length > 0);
    if (lines.length < 2) {
      throw new Error("CSV 데이터가 비어있거나 헤더만 존재합니다.");
    }

    const headers = parseCsvLine(stripBom(lines[0]));
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      rows.push(row);
    }

    const dedupMap = new Map();
    let skippedNoSchoolId = 0;
    let duplicateSchoolIdCount = 0;

    for (const rawRow of rows) {
      const row = buildRow(rawRow);
      if (!row) {
        skippedNoSchoolId += 1;
        continue;
      }
      const prev = dedupMap.get(row.school_id);
      if (!prev) {
        dedupMap.set(row.school_id, row);
        continue;
      }
      duplicateSchoolIdCount += 1;
      // 동일 school_id 중 modified_date가 더 최신인 행을 유지
      if (row._modified_date_cmp >= prev._modified_date_cmp) {
        dedupMap.set(row.school_id, row);
      }
    }

    const cleanRows = [...dedupMap.values()];

    const sql = `
      INSERT INTO schools (
        school_id, name, address, school_type, region,
        edu_office_code, edu_office_name, admin_standard_code, jurisdiction_org_name,
        road_address, road_address_detail, phone, homepage_url, coed_type, hs_general_type,
        anniversary_date, modified_date,
        school_level, founded_date, foundation_type, main_branch, operation_status,
        address_lot, latitude, longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    for (const row of cleanRows) {
      await connection.execute(sql, [
        row.school_id,
        row.name,
        row.address,
        row.school_type,
        row.region,
        row.edu_office_code,
        row.edu_office_name,
        row.admin_standard_code,
        row.jurisdiction_org_name,
        row.road_address,
        row.road_address_detail,
        row.phone,
        row.homepage_url,
        row.coed_type,
        row.hs_general_type,
        row.anniversary_date,
        row.modified_date,
        row.school_level,
        row.founded_date,
        row.foundation_type,
        row.main_branch,
        row.operation_status,
        row.address_lot,
        row.latitude,
        row.longitude,
      ]);
      upsertAttempted += 1;
    }
    await connection.commit();

    const [[countRow]] = await connection.execute("SELECT COUNT(*) AS cnt FROM schools");
    const dbCount = Number(countRow?.cnt ?? 0);

    console.log(
      [
        `✅ schools CSV 시드 완료 (소스: ${csvPath})`,
        `- total_students / total_posts / total_school_mails 는 시드에서 변경하지 않음 (배치 집계 유지)`,
        `- CSV 총 행(헤더 제외): ${rows.length}`,
        `- school_id 없음 스킵: ${skippedNoSchoolId}`,
        `- school_id 중복 제거 건수: ${duplicateSchoolIdCount}`,
        `- 정제 후 고유 school_id: ${cleanRows.length}`,
        `- 업서트 시도: ${upsertAttempted}`,
        `- DB schools 총 행수: ${dbCount}`,
      ].join("\n"),
    );
  } catch (err) {
    await connection.rollback();
    console.error("❌ schools CSV 시드 오류:", err?.message ?? String(err));
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();

