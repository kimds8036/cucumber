# -*- coding: utf-8 -*-
"""
NEIS 오픈API 연동 모듈
- 급식식단정보, 고등학교 시간표, 중학교 시간표 API
"""

import requests
from datetime import datetime, timedelta

# 인증키: https://open.neis.go.kr/ 에서 발급 후 아래에 입력하세요.
API_KEY = "010de2d810c04ad194eb1adaff8819b2"

# 에러 코드: 정상(INFO-000), 데이터 없음(INFO-200) 외에는 에러로 처리
ERROR_CODES = {
    "INFO-000": "정상 처리",
    "INFO-200": "해당하는 데이터가 없습니다",
    "ERROR-300": "필수 값 누락",
    "ERROR-290": "인증키 유효하지 않음",
    "ERROR-310": "서비스를 찾을 수 없음",
    "ERROR-333": "요청위치 값 타입 오류",
    "ERROR-336": "최대 1,000건 초과",
    "ERROR-337": "일별 트래픽 제한 초과",
    "ERROR-500": "서버 오류",
}

BASE_PARAMS = {"Key": API_KEY, "Type": "json"}


def _get_result_code(data):
    """응답에서 결과 코드 추출 (공통 구조 처리)."""
    if not isinstance(data, dict):
        return None, None
    if "RESULT" in data:
        r = data["RESULT"]
        if isinstance(r, dict):
            return r.get("CODE"), r.get("MESSAGE")
    # 데이터 키 내부 head[0].RESULT 구조
    for key in ("mealServiceDietInfo", "hisTimetable", "misTimetable"):
        if key in data and isinstance(data[key], list) and len(data[key]) > 0:
            head = data[key][0]
            if isinstance(head, dict) and "head" in head and head["head"]:
                h = head["head"][0]
                if "RESULT" in h:
                    return h["RESULT"].get("CODE"), h["RESULT"].get("MESSAGE")
    return None, None


def _handle_response(resp):
    """
    공통 에러 핸들러.
    - HTTP 오류 시 메시지 출력 후 종료
    - JSON 내 에러 코드 확인 후, 정상(INFO-000) 또는 데이터 없음(INFO-200)이 아니면 메시지 출력 후 종료
    - 정상이면 파싱된 JSON 반환
    """
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        print(f"[HTTP 오류] {e}")
        raise SystemExit(1)

    try:
        data = resp.json()
    except ValueError:
        print("[오류] 응답이 올바른 JSON이 아닙니다.")
        raise SystemExit(1)

    code, message = _get_result_code(data)
    if code is None:
        return data

    if code not in ("INFO-000", "INFO-200"):
        msg = ERROR_CODES.get(code, message or code)
        print(f"[API 오류] {code}: {msg}")
        raise SystemExit(1)

    return data


def _extract_row_list(data, key):
    """응답에서 row 리스트 추출. NEIS는 [0]=head, [1]=row 객체 구조."""
    if not data or key not in data or not data[key]:
        return []
    for item in data[key]:
        if isinstance(item, dict) and "row" in item:
            return item["row"] if item["row"] else []
    return []


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
        **BASE_PARAMS,
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
    data = _handle_response(r)
    rows = _extract_row_list(data, "mealServiceDietInfo")

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
        **BASE_PARAMS,
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
    data = _handle_response(r)
    rows = _extract_row_list(data, "hisTimetable")

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
        **BASE_PARAMS,
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
    data = _handle_response(r)
    rows = _extract_row_list(data, "misTimetable")

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
    ATPT_CODE = "B10"  # 예: B10 (서울)
    SCHUL_CODE = "7031199"  # 예: 7010123

    if not API_KEY:
        print("API_KEY를 입력한 뒤 실행하세요.")
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
    today_ymd = now.strftime("%Y%m%d")

    # 1. 급식 조회: 특정 학교의 이번 달 중식 조회
    print("=== 1. 급식 조회 (이번 달 중식) ===")
    print(f"조회 기간: {this_month_start} ~ {this_month_end} (중식)")
    get_meal_info(
        ATPT_CODE,
        SCHUL_CODE,
        meal_code=2,
        from_date=this_month_start,
        to_date=this_month_end,
    )

    # 2. 고등학교 시간표: 특정 날짜의 1학년 시간표 조회
    timetable_date = "20260310"  # 조회할 날짜 (YYYYMMDD), 오늘은 today_ymd
    print("=== 2. 고등학교 시간표 (특정 날짜, 1학년) ===")
    print(f"조회 날짜: {timetable_date} (1학년)")
    get_high_timetable(ATPT_CODE, SCHUL_CODE, date=timetable_date, grade="1")

    # 3. 중학교 시간표: 특정 날짜의 2학년 1반 시간표 조회
    print("=== 3. 중학교 시간표 (특정 날짜, 2학년 1반) ===")
    print(f"조회 날짜: {timetable_date} (2학년 1반)")
    get_middle_timetable(ATPT_CODE, SCHUL_CODE, date=timetable_date, grade="2", class_nm="1")
