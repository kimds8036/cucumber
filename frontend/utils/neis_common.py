# -*- coding: utf-8 -*-
"""
NEIS 오픈API 공통 모듈 (에러 처리, 응답 파싱)
food.py, timetable.py에서 import하여 사용
"""

import requests

# 인증키: https://open.neis.go.kr/ 에서 발급 후 아래에 입력하세요.
API_KEY = ""

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


def get_base_params():
    """API_KEY가 반영된 기본 파라미터 (매번 새 dict 반환)."""
    return {"Key": API_KEY, "Type": "json"}


def _get_result_code(data, data_keys):
    """응답에서 결과 코드 추출. data_keys: 해당 API의 응답 키 리스트 (예: ['mealServiceDietInfo'])."""
    if not isinstance(data, dict):
        return None, None
    if "RESULT" in data:
        r = data["RESULT"]
        if isinstance(r, dict):
            return r.get("CODE"), r.get("MESSAGE")
    for key in data_keys:
        if key in data and isinstance(data[key], list) and len(data[key]) > 0:
            head = data[key][0]
            if isinstance(head, dict) and "head" in head and head["head"]:
                h = head["head"][0]
                if "RESULT" in h:
                    return h["RESULT"].get("CODE"), h["RESULT"].get("MESSAGE")
    return None, None


def handle_response(resp, data_keys):
    """
    공통 에러 핸들러.
    resp: requests.Response
    data_keys: 해당 API 응답 키 리스트 (예: ['mealServiceDietInfo'] 또는 ['hisTimetable', 'misTimetable'])
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

    code, message = _get_result_code(data, data_keys)
    if code is None:
        return data

    if code not in ("INFO-000", "INFO-200"):
        msg = ERROR_CODES.get(code, message or code)
        print(f"[API 오류] {code}: {msg}")
        raise SystemExit(1)

    return data


def extract_row_list(data, key):
    """응답에서 row 리스트 추출. NEIS는 [0]=head, [1]=row 객체 구조."""
    if not data or key not in data or not data[key]:
        return []
    for item in data[key]:
        if isinstance(item, dict) and "row" in item:
            return item["row"] if item["row"] else []
    return []
