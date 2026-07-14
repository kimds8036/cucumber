import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.whitelist import protect_text, restore_text
from app.cleanbot import clean_message
import asyncio


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_jaji_ma_protected():
    text = "10시까지 자지 마"
    protected, mapping = protect_text(text)
    assert "자지" not in protected
    assert len(mapping) == 1
    restored = restore_text(protected, mapping)
    assert restored == text


def test_yapbozi_ma_protected():
    text = "얕보지 마 진짜"
    protected, mapping = protect_text(text)
    assert "보지" not in protected
    restored = restore_text(protected, mapping)
    assert restored == text


def test_real_profanity_not_protected():
    text = "이 보지같은 게"
    protected, mapping = protect_text(text)
    assert protected == text
    assert len(mapping) == 0


def test_multiple_exceptions_in_one_sentence():
    text = "자지 마 그리고 들여다보지 마"
    protected, mapping = protect_text(text)
    assert len(mapping) == 2
    restored = restore_text(protected, mapping)
    assert restored == text


def test_byeongsinnyeon_protected():
    text = "병신년 새해 복 많이 받으세요"
    protected, mapping = protect_text(text)
    assert "병신" not in protected
    assert any("병신년" in v for v in mapping.values())


def test_animal_saekki_protected():
    text = "강아지 새끼 너무 귀여워"
    protected, mapping = protect_text(text)
    assert "새끼" not in protected


def test_boda_compound_without_ma_protected():
    text = "한번 읽어보지"
    protected, mapping = protect_text(text)
    assert "보지" not in protected


def test_jada_imperative_protected():
    text = "빨리 자지"
    protected, mapping = protect_text(text)
    assert "자지" not in protected


def test_byeongsinnyeon_integration():
    result = run(clean_message("병신년 새해 복 많이 받으세요"))
    assert result["filtered"] == "병신년 새해 복 많이 받으세요"
    assert result["is_profane"] is False


def test_insult_still_masked():
    result = run(clean_message("이 병신아"))
    assert "**" in result["filtered"]
    assert result["is_profane"] is True


if __name__ == "__main__":
    test_jaji_ma_protected()
    test_yapbozi_ma_protected()
    test_real_profanity_not_protected()
    test_multiple_exceptions_in_one_sentence()
    test_byeongsinnyeon_protected()
    test_animal_saekki_protected()
    test_boda_compound_without_ma_protected()
    test_jada_imperative_protected()
    test_byeongsinnyeon_integration()
    test_insult_still_masked()
    print("모든 화이트리스트 테스트 통과")
