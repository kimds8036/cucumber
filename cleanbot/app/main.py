"""
Youth Paper 클린봇 API 서버.

사용 예:
  uvicorn app.main:app --reload --port 8001

엔드포인트:
  POST /clean
    body: {"text": "10시까지 자지 마"}
    response: {"original": "...", "filtered": "...", "is_profane": false, "source": "korcen"}
"""

import sys
import asyncio

# Windows에서 uvicorn(--reload 포함)이 SelectorEventLoop를 사용할 경우,
# httpx의 비동기 DNS 조회(getaddrinfo)가 일부 호스트에서
# "[Errno 11001] getaddrinfo failed"로 실패하는 문제가 있다.
# ProactorEventLoop를 강제 사용하여 이를 방지한다.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from pydantic import BaseModel

from .cleanbot import clean_message
from .whitelist import get_exception_descriptions

app = FastAPI(title="Youth Paper CleanBot")


class CleanRequest(BaseModel):
    text: str


class CleanResponse(BaseModel):
    original: str
    filtered: str
    is_profane: bool | None
    source: str


@app.post("/clean", response_model=CleanResponse)
async def clean(request: CleanRequest):
    result = await clean_message(request.text)
    return result


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "whitelist_patterns": len(get_exception_descriptions()),
    }