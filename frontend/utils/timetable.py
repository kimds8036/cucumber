# -*- coding: utf-8 -*-
"""
NEIS 오픈API - 고등학교/중학교 시간표 API
"""

import os
import sys
from datetime import datetime

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


def get_high_timetable(
    atpt_code,
    schul_code,
    ay=None,
    sem=None,
    date=None,
    grade=None,
    class_nm=None,
    from_date=None,
    to_date=None,
    page=1,
    page_size=100,
):
    """
    고등학교 시간표 API 호출.
    - date: 시간표일자 (ALL_TI_YMD, YYYYMMDD)
    - grade: 학년, class_nm: 학급명
    """
    url = "https://open.neis.go.kr/hub/hisTimetable"
    params = {
        **get_base_params(),
        "pIndex": page,
        "pSize": page_size,
        "ATPT_OFCDC_SC_CODE": atpt_code,
        "SD_SCHUL_CODE": schul_code,
    }
    if ay is not None:
        params["AY"] = ay
    if sem is not None:
        params["SEM"] = sem
    if date:
        params["ALL_TI_YMD"] = date
    if grade is not None:
        params["GRADE"] = grade
    if class_nm:
        params["CLASS_NM"] = class_nm
    if from_date:
        params["TI_FROM_YMD"] = from_date
    if to_date:
        params["TI_TO_YMD"] = to_date

    r = requests.get(url, params=params)
    data = handle_response(r, ["hisTimetable"])
    rows = extract_row_list(data, "hisTimetable")

    if not rows:
        print("(해당 조건에 맞는 고등학교 시간표 데이터가 없습니다.)")
    for row in rows:
        all_ti_ymd = row.get("ALL_TI_YMD", "")
        gr = row.get("GRADE", "")
        cl = row.get("CLASS_NM", "")
        perio = row.get("PERIO", "")
        itrt = row.get("ITRT_CNTNT", "")
        print(f"날짜: {all_ti_ymd} | 학년: {gr} | 학급: {cl} | 교시: {perio} | 수업: {itrt}")

    return rows


def get_middle_timetable(
    atpt_code,
    schul_code,
    ay=None,
    sem=None,
    date=None,
    grade=None,
    class_nm=None,
    perio=None,
    from_date=None,
    to_date=None,
    page=1,
    page_size=100,
):
    """
    중학교 시간표 API 호출.
    - date: 시간표일자 (ALL_TI_YMD), grade: 학년, class_nm: 학급명, perio: 교시
    """
    url = "https://open.neis.go.kr/hub/misTimetable"
    params = {
        **get_base_params(),
        "pIndex": page,
        "pSize": page_size,
        "ATPT_OFCDC_SC_CODE": atpt_code,
        "SD_SCHUL_CODE": schul_code,
    }
    if ay is not None:
        params["AY"] = ay
    if sem is not None:
        params["SEM"] = sem
    if date:
        params["ALL_TI_YMD"] = date
    if grade is not None:
        params["GRADE"] = grade
    if class_nm:
        params["CLASS_NM"] = class_nm
    if perio is not None:
        params["PERIO"] = perio
    if from_date:
        params["TI_FROM_YMD"] = from_date
    if to_date:
        params["TI_TO_YMD"] = to_date

    r = requests.get(url, params=params)
    data = handle_response(r, ["misTimetable"])
    rows = extract_row_list(data, "misTimetable")

    if not rows:
        print("(해당 조건에 맞는 중학교 시간표 데이터가 없습니다.)")
    for row in rows:
        all_ti_ymd = row.get("ALL_TI_YMD", "")
        gr = row.get("GRADE", "")
        cl = row.get("CLASS_NM", "")
        per = row.get("PERIO", "")
        itrt = row.get("ITRT_CNTNT", "")
        print(f"날짜: {all_ti_ymd} | 학년: {gr} | 학급: {cl} | 교시: {per} | 수업: {itrt}")

    return rows


if __name__ == "__main__":
    # 여기에 학교 코드를 입력하세요 (시도교육청코드, 행정표준코드)
    ATPT_CODE = ""  # 예: B10 (서울)
    SCHUL_CODE = ""  # 예: 7010123
    timetable_date = datetime.now().strftime("%Y%m%d")  # 조회할 날짜 (YYYYMMDD)

    if not API_KEY:
        print("API_KEY를 neis_common.py에서 설정한 뒤 실행하세요.")
        raise SystemExit(1)
    if not ATPT_CODE or not SCHUL_CODE:
        print("ATPT_CODE, SCHUL_CODE를 입력한 뒤 실행하세요.")
        raise SystemExit(1)

    # 고등학교 시간표: 특정 날짜의 1학년
    print("=== 고등학교 시간표 (특정 날짜, 1학년) ===")
    print(f"조회 날짜: {timetable_date} (1학년)")
    get_high_timetable(ATPT_CODE, SCHUL_CODE, date=timetable_date, grade="1")

    # 중학교 시간표: 특정 날짜의 2학년 1반
    print("=== 중학교 시간표 (특정 날짜, 2학년 1반) ===")
    print(f"조회 날짜: {timetable_date} (2학년 1반)")
    get_middle_timetable(ATPT_CODE, SCHUL_CODE, date=timetable_date, grade="2", class_nm="1")
