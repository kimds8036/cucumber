"""
클린봇 핵심 처리 로직.

처리 순서:
  1. 화이트리스트 패턴 매칭 -> 임시 토큰으로 치환 (오탐 방지)
  2. korcen pip 필터 적용
  3. korcen 실패 시 로컬 fallback 필터 적용
  4. 임시 토큰 -> 원본 텍스트로 복원
"""

import logging

from .whitelist import protect_text, restore_text
from .filter_client import call_filter_api, extract_filtered_text, extract_is_profane, ProfanityFilterError
from .local_fallback import local_filter

logger = logging.getLogger("cleanbot.cleanbot")


async def clean_message(text: str) -> dict:
    """
    채팅 메시지를 클린봇으로 처리한다.

    Returns:
        {
            "original": str,
            "filtered": str,
            "is_profane": bool | None,
            "source": str,  # "korcen" | "local_fallback" | "none_needed"
        }
    """
    if not text or not text.strip():
        return {"original": text, "filtered": text, "is_profane": False, "source": "none_needed"}

    protected_text, mapping = protect_text(text)

    try:
        filter_response = await call_filter_api(protected_text)
        filtered = extract_filtered_text(filter_response, protected_text)
        is_profane = extract_is_profane(filter_response)
        source = "korcen"
    except ProfanityFilterError as e:
        logger.warning("korcen 필터 실패, 로컬 fallback 사용: %s", e)
        filtered = local_filter(protected_text)
        is_profane = filtered != protected_text
        source = "local_fallback"

    restored = restore_text(filtered, mapping)

    # 화이트리스트 복원 후 원문과 같으면 비속어 아님으로 최종 판정
    if restored == text:
        is_profane = False
    elif is_profane is None:
        is_profane = restored != text

    return {
        "original": text,
        "filtered": restored,
        "is_profane": is_profane,
        "source": source,
    }