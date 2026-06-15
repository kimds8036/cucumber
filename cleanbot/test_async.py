import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(timeout=5.0, trust_env=False) as client:
        r = await client.post(
            "https://api.profanity.kr-filter.com/api/v1/filter",
            json={"text": "욕설을 사용하지 ㅅㅂ 마세요.", "mode": "FILTER", "callbackUrl": None},
            headers={
                "Content-Type": "application/json;charset=UTF-8",
                "accept": "application/json",
                "x-api-key": "tcJ7u_KHNlZZV-ImRtnFIpNYg8ikmva1agBXmYysyDA",
            },
        )
        print(r.status_code)
        print(r.json())

asyncio.run(main())