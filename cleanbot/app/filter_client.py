"""
korcen pip 기반 비속어 필터 클라이언트.

korcen 탐지 로직으로 욕설 구간을 찾아 동일 길이의 '*'로 치환한다.
(highlight_profanity는 *로 감싸기만 하므로 사용하지 않음)

응답 형식 (내부 표준):
  {
    "filtered": "욕설을 사용하지 ** 마세요.",
    "is_profane": True,
  }
"""

import asyncio
import logging
import re

from korcen import korcen

from . import config

logger = logging.getLogger("cleanbot.filter_client")

_KOREAN_LEVELS = [
    "general", "minor", "sexual", "belittle",
    "race", "parent", "special", "politics",
]


class ProfanityFilterError(Exception):
    """korcen 필터 실행 실패 시 발생"""
    pass


def _resolve_levels(level: str) -> list[str]:
    level = level.lower()
    if level == "korean":
        return _KOREAN_LEVELS
    if level == "all":
        from korcen.korcen import BETTER_PROFANITY_LOADED

        levels = _KOREAN_LEVELS.copy()
        if BETTER_PROFANITY_LOADED:
            levels.append("english")
        levels.extend(["japanese", "chinese"])
        return levels
    return [level]


def _mask_match(text: str, matched_pattern: str) -> str:
    """탐지된 패턴과 일치하는 구간을 동일 길이의 '*'로 치환한다."""
    flexible_regex = re.compile(
        korcen.build_flexible_regex(matched_pattern),
        re.IGNORECASE,
    )
    return flexible_regex.sub(lambda m: "*" * len(m.group(0)), text)


def korcen_filter(text: str) -> dict:
    """
    korcen으로 텍스트를 필터링한다. (동기)

    Returns:
        {"filtered": str, "is_profane": bool}
    """
    levels = _resolve_levels(config.FILTER_LEVEL)
    result = text
    is_profane = False
    changed = True

    while changed:
        changed = False
        for level in levels:
            matched = korcen.check_and_report_profanity_pattern(result, level=level)
            if not matched:
                continue

            try:
                masked = _mask_match(result, matched)
            except re.error as e:
                logger.warning("korcen regex 오류 (level=%s, pattern=%s): %s", level, matched, e)
                continue

            if masked != result:
                result = masked
                is_profane = True
                changed = True

    return {
        "filtered": result,
        "is_profane": is_profane,
    }


async def call_filter_api(text: str, mode: str | None = None, callback_url: str | None = None) -> dict:
    """
    korcen 필터를 비동기로 실행한다.

    FastAPI 이벤트 루프를 블로킹하지 않도록 asyncio.to_thread로 감싼다.
    cleanbot.py와의 호환을 위해 함수명은 call_filter_api를 유지한다.

    Raises:
        ProfanityFilterError: korcen 실행 실패
    """
    try:
        return await asyncio.to_thread(korcen_filter, text)
    except Exception as e:
        logger.warning("Korcen filter error: %r (%s)", e, type(e))
        raise ProfanityFilterError("korcen 필터 실행 실패") from e


def extract_filtered_text(api_response: dict, original_text: str) -> str:
    """응답에서 필터링된 텍스트를 추출한다."""
    filtered = api_response.get("filtered")
    if isinstance(filtered, str):
        return filtered

    logger.warning("알 수 없는 korcen 응답 형식: %s", api_response)
    return original_text


def extract_is_profane(api_response: dict) -> bool | None:
    """비속어 포함 여부를 판단한다."""
    is_profane = api_response.get("is_profane")
    if isinstance(is_profane, bool):
        return is_profane

    detected = api_response.get("detected")
    if isinstance(detected, list):
        return len(detected) > 0
    return None
