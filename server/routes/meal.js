/**
 * GET /api/meal/:schulCode/:yyyymm
 * 캐시 키: meal_{schulCode}_{yyyymm}
 * 캐시 미스 시 Python 호출 후 자정까지 TTL로 저장
 */

import { Router } from "express";
import { getCache, setCache } from "../cache.js";
import { fetchMealsFromPython } from "../services/mealService.js";

const router = Router();

/** 오늘 자정(다음날 00:00:00)까지 남은 밀리초 */
function ttlUntilMidnightMs() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now.getTime());
}

/**
 * GET /api/meal/:schulCode/:yyyymm
 * query: atptCode (선택) - 시도교육청코드
 */
router.get("/:schulCode/:yyyymm", async (req, res) => {
  const { schulCode, yyyymm } = req.params;
  const atptCode = (req.query.atptCode || "").trim();

  const cacheKey = `meal_${schulCode}_${yyyymm}`;

  try {
    let data = getCache(cacheKey);
    if (data != null) {
      return res.json(data);
    }

    data = await fetchMealsFromPython(schulCode, yyyymm, atptCode);
    const ttl = ttlUntilMidnightMs();
    setCache(cacheKey, data, ttl);

    res.json(data);
  } catch (err) {
    console.error("[meal route]", err);
    res.status(500).json({ error: "급식 데이터를 가져오지 못했습니다." });
  }
});

export default router;
