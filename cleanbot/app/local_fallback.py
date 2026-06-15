"""
korcen 필터 장애 시 사용할 fallback.

1차: korcen_filter 재시도
2차: 최소 키워드 블랙리스트 (korcen import 불가 등 극단적 상황)
"""

import re
import logging

logger = logging.getLogger("cleanbot.local_fallback")

_LOCAL_BLACKLIST = [
    "씨발", "시발", "ㅅㅂ", "병신", "ㅄ", "개새끼", "새끼",
    "지랄", "ㅈㄹ", "존나", "ㅈㄴ", "닥쳐", "꺼져",
]

_PATTERNS = [re.compile(re.escape(word)) for word in _LOCAL_BLACKLIST]


def _minimal_filter(text: str) -> str:
    result = text
    for pattern, word in zip(_PATTERNS, _LOCAL_BLACKLIST):
        result = pattern.sub("*" * len(word), result)
    return result


def local_filter(text: str) -> str:
    """korcen 실패 시 fallback 필터"""
    try:
        from .filter_client import korcen_filter
        return korcen_filter(text)["filtered"]
    except Exception as e:
        logger.warning("korcen fallback 실패, 최소 블랙리스트 사용: %s", e)
        return _minimal_filter(text)


def contains_profanity_locally(text: str) -> bool:
    return _minimal_filter(text) != text
