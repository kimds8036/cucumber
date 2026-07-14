"""
비속어 필터의 문맥 오탐(false positive)을 줄이기 위한 화이트리스트 모듈.

예: "10시까지 자지 마" -> "자지"가 동사 "자다"의 활용형이므로 비속어가 아님
    "얕보지 마" -> "보지"가 동사 "보다"의 활용형이므로 비속어가 아님

전략:
  1. korcen 호출 전, 화이트리스트 패턴에 매칭되는 구간을 임시 토큰으로 치환
  2. 필터링 후 임시 토큰을 원래 텍스트로 복원

새로운 오탐 케이스가 발견되면 EXCEPTION_PATTERNS에 패턴만 추가하면 된다.
"""

import re

_TOKEN_PREFIX = "WLPH"  # WhiteListPlaceHolder

# (?P<...>) 없이 순서대로 적용. 구체적인 패턴을 앞에 둔다.
EXCEPTION_PATTERNS = [
    # --- 자다 활용형 (자지) ---
    (re.compile(r"자지(?=\s*(마라|마요|마세요|마|말|않|못))"), "자다 활용형 (자지 마/말/않 등)"),
    (re.compile(r"자지(?=\s*(못|않)(하|했|할))"), "자다 + 못/않 + 하다 활용형"),
    # "빨리 자지", "일찍 자지" 등 자다 청유형 (문장 끝, '마' 없음)
    (re.compile(
        r"(일찍|빨리|얼른|제발|늦게|피곤해|졸려|일어나서|오늘은|그만)\s*자지(?=\s*($|[.!?,]))"
    ), "자다 청유형 (빨리 자지 등)"),

    # --- 보다 활용형 (보지) ---
    (re.compile(r"보지(?=\s*(마라|마요|마세요|마|말|않|못|만))"), "보다 활용형 (보지 마/말/않 등)"),
    # 해보지/먹어보지/읽어보지 등 -보다 합성동사 (마 있거나 문장 끝)
    (re.compile(
        r"([가-힣]{2,})보지(?=\s*(마라|마요|마세요|마|말|않|못|만)?\s*($|[.!?,]))"
    ), "~보다 합성동사 (해보지/먹어보지 등)"),
    # 얕보지, 들여다보지 등 (기존 명시 목록 — 위 패턴에 포함되지만 가독성용 유지)
    (re.compile(r"(얕|낮춰|들여다|쳐다|넘겨|돌아|돌이켜|훔쳐)보지(?=\s*(마라|마요|마세요|마|말|않|못|만)?)"),
     "~보다 합성동사 (얕보지/들여다보지 등)"),

    # --- 새해·인사 말장난 (병신년 전체를 한 덩어리로 보호) ---
    (re.compile(r"병신년"), "병신년 새해 인사"),

    # --- 동물 새끼 (어린 개체, 비하가 아님) ---
    (re.compile(
        r"(강아지|고양이|송아지|병아리|망아지|물고기|토끼|호랑이|앵무새|새)\s+새끼"
    ), "동물 새끼"),
]


def protect_text(text: str):
    """
    화이트리스트 패턴에 매칭되는 부분을 임시 토큰으로 치환한다.

    Returns:
        protected_text: 토큰으로 치환된 텍스트 (korcen에 전달할 텍스트)
        mapping: {토큰: 원본 문자열} 딕셔너리 (복원에 사용)
    """
    mapping = {}
    protected_text = text
    counter = [0]

    for pattern, _desc in EXCEPTION_PATTERNS:
        def _replace(match):
            token = f"{_TOKEN_PREFIX}{counter[0]}"
            mapping[token] = match.group(0)
            counter[0] += 1
            return token

        protected_text = pattern.sub(_replace, protected_text)

    return protected_text, mapping


def restore_text(filtered_text: str, mapping: dict) -> str:
    """필터 응답에서 토큰을 원래 텍스트로 복원한다."""
    restored = filtered_text
    for token, original in mapping.items():
        restored = restored.replace(token, original)
    return restored


def get_exception_descriptions():
    """현재 등록된 화이트리스트 패턴 설명 목록 (관리/디버깅용)"""
    return [desc for _, desc in EXCEPTION_PATTERNS]
