# 학생증 OCR — 네이버 클라우드 CLOVA General OCR

가입 API `POST /api/auth/signup/verify-student-id`는 **Tesseract를 사용하지 않고** CLOVA General OCR만 호출합니다.

## 콘솔 설정

1. [NAVER Cloud Platform](https://www.ncloud.com) → **AI Services** → **OCR**
2. **General** 도메인 생성
3. **API Gateway 연동**(자동 연동 권장) 후 다음 값 확보:
   - **Invoke URL** — 경로가 `/general`로 끝나는 전체 URL
   - **Secret Key** — `X-OCR-SECRET` 헤더 값

## 환경 변수 (백엔드)

| 변수 | 설명 |
|------|------|
| `NAVER_CLOVA_OCR_INVOKE_URL` | API Gateway Invoke URL (`.../general`) |
| `NAVER_CLOVA_OCR_SECRET` | 앱 Secret Key |

로컬: `back/.env`  
Railway develop/production: Variables에 동일 키 등록 후 재배포.

## 동작

1. 클라이언트가 `imageBase64` + 선택 `cropRegion` 전송
2. 서버가 sharp로 crop(있을 때) → CLOVA OCR `V2`, `lang: ko`
3. 응답 `fields[].inferText` 등을 합쳐 검증(이름·학교급·학교 DB 매칭)

## 디버그

`ENABLE_OCR_DEBUG=true` 또는 `NODE_ENV !== production` 시 Railway/서버 로그에 OCR 원문·checks 출력.

## 참고

- [General OCR API 문서](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr)
- 요금·쿼터는 NCP OCR 요금제 따름
