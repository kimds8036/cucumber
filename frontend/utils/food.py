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
    )
except ImportError:
    from neis_common import (
        API_KEY,
        get_base_params,
        handle_response,
        extract_row_list,
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


if __name__ == "__main__":
    # 여기에 학교 코드를 입력하세요 (시도교육청코드, 행정표준코드)
    ATPT_CODE = ""  # 예: B10 (서울)
    SCHUL_CODE = ""  # 예: 7010123

    if not API_KEY:
        print("API_KEY를 neis_common.py 또는 이 파일 상단에서 설정한 뒤 실행하세요.")
        raise SystemExit(1)
    if not ATPT_CODE or not SCHUL_CODE:
        print("ATPT_CODE, SCHUL_CODE를 입력한 뒤 실행하세요.")
        raise SystemExit(1)

    now = datetime.now()
    this_month_start = now.replace(day=1).strftime("%Y%m%d")
    if now.month == 12:
        next_month = now.replace(year=now.year + 1, month=1, day=1)
    else:
        next_month = now.replace(month=now.month + 1, day=1)
    this_month_end = (next_month - timedelta(days=1)).strftime("%Y%m%d")

    print("=== 급식 조회 (이번 달 중식) ===")
    print(f"조회 기간: {this_month_start} ~ {this_month_end} (중식)")
    get_meal_info(
        ATPT_CODE,
        SCHUL_CODE,
        meal_code=2,
        from_date=this_month_start,
        to_date=this_month_end,
    )
