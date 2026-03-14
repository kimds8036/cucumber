# -*- coding: utf-8 -*-
"""
NEIS 오픈API - 급식식단정보 API
"""

import os
import sys
from datetime import datetime, timedelta

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
):
    """
    지정한 날짜의 조식·중식·석식을 모두 조회하여 출력.
    - date: 급식일자 (YYYYMMDD)
    - 반환: 세 식사 결과를 합친 row 리스트
    """
    meal_codes = [(1, "조식"), (2, "중식"), (3, "석식")]
    all_rows = []
    for code, name in meal_codes:
        print(f"=== {name} ===")
        rows = get_meal_info(
            atpt_code,
            schul_code,
            meal_code=code,
            date=date,
            page=page,
            page_size=page_size,
        )
        all_rows.extend(rows)
    return all_rows


if __name__ == "__main__":
    # 조회 방식 1: 시도교육청코드 + 행정표준코드 직접 입력
    ATPT_CODE = ""  # 예: B10 (서울)
    SCHUL_CODE = ""  # 예: 7031199
    # 조회 방식 2: 학교명만 입력 (위 두 코드를 비워두고 아래만 입력)
    SCHOOL_NAME = "신도중학교"  # 예: 진관고등학교, 광남고

    if not API_KEY:
        print("API_KEY를 neis_common.py에서 설정한 뒤 실행하세요.")
        raise SystemExit(1)

    ATPT_CODE, SCHUL_CODE = resolve_school(
        atpt_code=ATPT_CODE or None,
        schul_code=SCHUL_CODE or None,
        school_name=SCHOOL_NAME or None,
    )

    # 조회할 날짜 (YYYYMMDD). 비우면 오늘 날짜 사용
    MEAL_DATE = "20260310"  # 예: "20250315"
    meal_date = MEAL_DATE if MEAL_DATE else datetime.now().strftime("%Y%m%d")

    print("=== 급식 조회 (조식·중식·석식) ===")
    print(f"조회 날짜: {meal_date}")
    get_meals_by_date(ATPT_CODE, SCHUL_CODE, meal_date)
