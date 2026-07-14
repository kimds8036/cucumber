"""
clean_message() 전체 흐름을 API 모킹으로 테스트한다.
가상의 비속어 필터 API가 "자지", "보지" 같은 단어를 문맥과 무관하게
무조건 *로 치환한다고 가정했을 때, 화이트리스트가 이를 막아주는지 확인한다.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import cleanbot, filter_client

_NAIVE_BLACKLIST = ["자지", "보지", "씨발", "병신"]


async def fake_call_filter_api(text, mode="FILTER", callback_url=None):
    filtered = text
    detected = []
    for word in _NAIVE_BLACKLIST:
        if word in filtered:
            detected.append({"length": len(word), "filteredWord": word})
            filtered = filtered.replace(word, "*" * len(word))
    return {
        "trackingId": "test",
        "status": {"code": 2000, "message": "Ok", "description": "", "DetailDescription": ""},
        "detected": detected,
        "filtered": filtered,
        "elapsed": "0 s",
    }


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_jaji_ma_not_masked(monkeypatch):
    monkeypatch.setattr(filter_client, "call_filter_api", fake_call_filter_api)
    monkeypatch.setattr("app.cleanbot.call_filter_api", fake_call_filter_api)

    result = run(cleanbot.clean_message("10시까지 자지 마"))
    assert result["filtered"] == "10시까지 자지 마"
    assert result["source"] == "korcen"


def test_yapbozi_ma_not_masked(monkeypatch):
    monkeypatch.setattr("app.cleanbot.call_filter_api", fake_call_filter_api)

    result = run(cleanbot.clean_message("얕보지 마라"))
    assert result["filtered"] == "얕보지 마라"


def test_real_profanity_still_masked(monkeypatch):
    monkeypatch.setattr("app.cleanbot.call_filter_api", fake_call_filter_api)

    result = run(cleanbot.clean_message("씨발 진짜"))
    assert result["filtered"] == "** 진짜"
    assert result["is_profane"] is True


def test_noun_bozi_still_masked(monkeypatch):
    monkeypatch.setattr("app.cleanbot.call_filter_api", fake_call_filter_api)

    result = run(cleanbot.clean_message("이 보지같은 게"))
    assert "**" in result["filtered"]


if __name__ == "__main__":
    class _MP:
        def setattr(self, target, name, value=None):
            if isinstance(target, str):
                mod_path, attr = target.rsplit(".", 1)
                import importlib
                mod = importlib.import_module(mod_path)
                setattr(mod, attr, name)
            else:
                setattr(target, name, value)

    mp = _MP()
    test_jaji_ma_not_masked(mp)
    test_yapbozi_ma_not_masked(mp)
    test_real_profanity_still_masked(mp)
    test_noun_bozi_still_masked(mp)
    print("모든 클린봇 통합 테스트 통과")