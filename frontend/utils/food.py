# -*- coding: utf-8 -*-
"""
NEIS 오픈API - 급식식단정보 API

CLI: python3 food.py <schulCode> <yyyymm> [atptCode]
  - stdout에만 JSON 배열 출력 (date, dayBadge, mealType, menu, calories)
  - atptCode 생략 시 학교명 없이 조회 불가하므로 서버에서 query로 전달 권장
"""

import json
import os
import sys
from datetime import datetime, timedelta
import calendar

# 스크립트로 실행 시 같은 폴더의 neis_common 로드
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests
try:
    from .neis_common import (
        API_KEY,
        get_base_params,
        handle_response,
        extract_row_list,
        resolve_school,
    )
except ImportError:
    from neis_common import (
        API_KEY,
        get_base_params,
        handle_response,
        extract_row_list,
        resolve_school,
    )


def get_meal_info(
    atpt_code,
    schul_code,
    meal_code=None,
    date=None,
    from_date=None,
    to_date=None,
    page=1,
    page_size=100,
    silent=False,
):
    """
    급식식단정보 API 호출.
    - atpt_code: 시도교육청코드 (ATPT_OFCDC_SC_CODE)
    - schul_code: 행정표준코드 (SD_SCHUL_CODE)
    - meal_code: 식사코드 (1=조식, 2=중식, 3=석식)
    - date: 급식일자 (YYYYMMDD)
    - from_date: 급식시작일자, to_date: 급식종료일자
    """
    url = "https://open.neis.go.kr/hub/mealServiceDietInfo"
    params = {
        **get_base_params(),
        "pIndex": page,
        "pSize": page_size,
        "ATPT_OFCDC_SC_CODE": atpt_code,
        "SD_SCHUL_CODE": schul_code,
    }
    if meal_code is not None:
        params["MMEAL_SC_CODE"] = meal_code
    if date:
        params["MLSV_YMD"] = date
    if from_date:
        params["MLSV_FROM_YMD"] = from_date
    if to_date:
        params["MLSV_TO_YMD"] = to_date

    r = requests.get(url, params=params)
    data = handle_response(r, ["mealServiceDietInfo"])
    rows = extract_row_list(data, "mealServiceDietInfo")

    if not silent:
        if not rows:
            print("(해당 조건에 맞는 급식 데이터가 없습니다.)")
        for row in rows:
            mlsv_ymd = row.get("MLSV_YMD", "")
            mmeal_nm = row.get("MMEAL_SC_NM", "")
            ddish_nm = row.get("DDISH_NM", "")
            cal_info = row.get("CAL_INFO", "")
            menus = [s.strip() for s in ddish_nm.split("<br/>") if s.strip()]
            print(f"날짜: {mlsv_ymd} | 식사: {mmeal_nm} | 칼로리: {cal_info}")
            print("  메뉴:", ", ".join(menus))
            print()

    return rows


def get_meals_by_date(
    atpt_code,
    schul_code,
    date,
    page=1,
    page_size=100,
    silent=False,
):
    """
    지정한 날짜의 조식·중식·석식을 모두 조회하여 출력.
    - date: 급식일자 (YYYYMMDD)
    - 반환: 세 식사 결과를 합친 row 리스트
    """
    meal_codes = [(1, "조식"), (2, "중식"), (3, "석식")]
    all_rows = []
    for code, name in meal_codes:
        if not silent:
            print(f"=== {name} ===")
        rows = get_meal_info(
            atpt_code,
            schul_code,
            meal_code=code,
            date=date,
            page=page,
            page_size=page_size,
            silent=silent,
        )
        all_rows.extend(rows)
    return all_rows


def _month_range(ymd_str):
    """YYYYMMDD 문자열로 해당 월의 1일·말일(YYYYMMDD) 반환."""
    dt = datetime.strptime(ymd_str, "%Y%m%d")
    _, last_day = calendar.monthrange(dt.year, dt.month)
    first = dt.replace(day=1)
    last = dt.replace(day=last_day)
    return first.strftime("%Y%m%d"), last.strftime("%Y%m%d")


def get_meals_by_month(
    atpt_code,
    schul_code,
    date,
    page=1,
    page_size=500,
    silent=False,
):
    """
    조회한 날짜 기준 해당 달(1일~말일) 전체 급식을 조회하여 출력.
    - date: 급식일자 (YYYYMMDD), 이 날짜가 속한 월 전체 조회
    - 반환: 해당 월의 모든 급식 row 리스트
    """
    from_ymd, to_ymd = _month_range(date)
    meal_codes = [(1, "조식"), (2, "중식"), (3, "석식")]
    all_rows = []
    for code, name in meal_codes:
        if not silent:
            print(f"=== {name} ({from_ymd} ~ {to_ymd}) ===")
        rows = get_meal_info(
            atpt_code,
            schul_code,
            meal_code=code,
            from_date=from_ymd,
            to_date=to_ymd,
            page=page,
            page_size=page_size,
            silent=silent,
        )
        all_rows.extend(rows)
    return all_rows


DAY_NAMES = ("월", "화", "수", "목", "금", "토", "일")


def meals_to_json_rows(rows):
    """NEIS row 리스트를 스펙 형식의 객체 리스트로 변환."""
    result = []
    for row in rows:
        mlsv_ymd = row.get("MLSV_YMD", "")
        if not mlsv_ymd:
            continue
        try:
            dt = datetime.strptime(mlsv_ymd, "%Y%m%d")
            day_badge = DAY_NAMES[dt.weekday()]
        except (ValueError, IndexError):
            day_badge = ""
        mmeal_nm = row.get("MMEAL_SC_NM", "").strip()
        ddish_nm = row.get("DDISH_NM", "")
        menus = [s.strip() for s in ddish_nm.split("<br/>") if s.strip()]
        cal_info = (row.get("CAL_INFO") or "").strip()
        result.append({
            "date": mlsv_ymd,
            "dayBadge": day_badge,
            "mealType": mmeal_nm,
            "menu": menus,
            "calories": cal_info or "",
        })
    return result


if __name__ == "__main__":
    # CLI 모드: python3 food.py <schulCode> <yyyymm> [atptCode] → stdout에 JSON만 출력
    if len(sys.argv) >= 3:
        schul_code_arg = sys.argv[1].strip()
        yyyymm_arg = sys.argv[2].strip()
        atpt_code_arg = sys.argv[3].strip() if len(sys.argv) > 3 else ""
        if not API_KEY:
            sys.stderr.write("API_KEY를 neis_common.py에서 설정한 뒤 실행하세요.\n")
            sys.exit(1)
        if not atpt_code_arg:
            sys.stderr.write("CLI 모드에서는 atptCode(시도교육청코드)가 필요합니다.\n")
            sys.exit(1)
        try:
            # yyyymm → 해당 월 1일 기준 YYYYMMDD
            first_day = f"{yyyymm_arg}01"
            rows = get_meals_by_month(
                atpt_code_arg,
                schul_code_arg,
                first_day,
                page=1,
                page_size=500,
                silent=True,
            )
            out = meals_to_json_rows(rows)
            print(json.dumps(out, ensure_ascii=False))
        except Exception as e:
            sys.stderr.write(str(e) + "\n")
            sys.exit(1)
        sys.exit(0)

    # 대화형 모드: 조회 방식 행정표준코드 + 학교명
    SCHUL_CODE = "7530178"  # 예: 7031199
    SCHOOL_NAME = "신성고등학교"  # 예: 진관고등학교, 광남고

    if not API_KEY:
        print("API_KEY를 neis_common.py에서 설정한 뒤 실행하세요.")
        raise SystemExit(1)

    ATPT_CODE, SCHUL_CODE = resolve_school(
        schul_code=SCHUL_CODE or None,
        school_name=SCHOOL_NAME or None,
    )

    # 조회할 날짜 (YYYYMMDD). 비우면 오늘 날짜 사용. 해당 달 1일~말일 전체 조회
    MEAL_DATE = ""  # 예: "20250315"
    meal_date = MEAL_DATE if MEAL_DATE else datetime.now().strftime("%Y%m%d")
    from_ymd, to_ymd = _month_range(meal_date)

    print("=== 급식 조회 (조회일 기준 해당 달 전체: 조식·중식·석식) ===")
    print(f"조회 날짜 기준: {meal_date} → 해당 달: {from_ymd} ~ {to_ymd}")
    get_meals_by_month(ATPT_CODE, SCHUL_CODE, meal_date)
