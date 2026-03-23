/**
 * food.py 실행 → stdout JSON 파싱 후 반환
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Python 스크립트 경로. 기본값: 프로젝트 frontend/utils/food.py */
const defaultScriptPath = path.resolve(
  __dirname,
  "../../frontend/utils/food.py"
);

/**
 * @param {string} schulCode - 행정표준코드
 * @param {string} yyyymm - YYYYMM
 * @param {string} [atptCode] - 시도교육청코드 (NEIS 필수, 있으면 전달)
 * @returns {Promise<Array<{ date: string, dayBadge: string, mealType: string, menu: string[], calories: string }>>}
 */
export async function fetchMealsFromPython(schulCode, yyyymm, atptCode = "") {
  const scriptPath = process.env.PYTHON_SCRIPT_PATH || defaultScriptPath;
  const pythonCmd = process.env.PYTHON_CMD || "python3";
  // CLI: python3 food.py <schulCode> <yyyymm> [atptCode]
  const args = [schulCode, yyyymm];
  if (atptCode) args.push(atptCode);
  const cmd = `"${pythonCmd}" "${scriptPath}" ${args.map((a) => `"${a}"`).join(" ")}`;

  const { stdout, stderr } = await execAsync(cmd, {
    maxBuffer: 2 * 1024 * 1024,
    encoding: "utf8",
  });

  if (stderr && stderr.trim()) {
    console.error("[mealService] stderr:", stderr.trim());
  }

  const trimmed = (stdout || "").trim();
  if (!trimmed) return [];

  try {
    const data = JSON.parse(trimmed);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new Error(`급식 데이터 파싱 실패: ${e.message}`);
  }
}
