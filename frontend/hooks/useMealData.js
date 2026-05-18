import { useState, useEffect } from "react";
import Constants from "expo-constants";
import { API_URLS } from "../config/apiEnv.js";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  API_URLS.develop
).replace(/\/+$/, "");

/**
 * 현재 달 yyyymm (YYYYMM) 계산
 */
function getCurrentYyyymm() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/**
 * 오늘 날짜 YYYYMMDD
 */
function getTodayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * schulCode로 해당 달 급식 조회 후, 오늘 이후 급식만 필터링해 앞 3개 반환
 * @param {string} schulCode - 행정표준코드
 * @param {string} [atptCode] - 시도교육청코드 (선택, query로 전달)
 * @returns {{ upcomingMeals: Array, loading: boolean, error: string | null }}
 */
export function useMealData(schulCode, atptCode = "") {
  const [upcomingMeals, setUpcomingMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schulCode || !schulCode.trim()) {
      setLoading(false);
      setUpcomingMeals([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const yyyymm = getCurrentYyyymm();
    const todayYmd = getTodayYmd();
    const url = atptCode
      ? `${BASE_URL}/api/meal/${encodeURIComponent(schulCode)}/${yyyymm}?atptCode=${encodeURIComponent(atptCode)}`
      : `${BASE_URL}/api/meal/${encodeURIComponent(schulCode)}/${yyyymm}`;

    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("급식 정보를 불러오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const upcoming = list
          .filter((item) => item.date >= todayYmd)
          .slice(0, 3);
        setUpcomingMeals(upcoming);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "오류가 발생했습니다.");
          setUpcomingMeals([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schulCode, atptCode]);

  return { upcomingMeals, loading, error };
}
