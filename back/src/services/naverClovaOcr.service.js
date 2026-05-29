import crypto from 'crypto';

function getOcrConfig() {
  const invokeUrl = process.env.NAVER_CLOVA_OCR_INVOKE_URL?.trim();
  const secret = process.env.NAVER_CLOVA_OCR_SECRET?.trim();
  if (!invokeUrl || !secret) {
    throw new Error(
      'NAVER_CLOVA_OCR_INVOKE_URL 및 NAVER_CLOVA_OCR_SECRET 환경 변수가 필요합니다.',
    );
  }
  return { invokeUrl, secret };
}

export function detectImageFormat(buffer) {
  if (!buffer?.length) return 'jpg';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  return 'jpg';
}

function pushInferText(node, out) {
  const t = String(node?.inferText ?? '').trim();
  if (t) out.push(t);
}

/** fields / tables / cells 등 응답 트리에서 inferText 수집 */
export function collectInferTexts(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  pushInferText(node, out);

  for (const key of ['fields', 'tables', 'cells', 'cellTextLines', 'cellWords']) {
    const arr = node[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) collectInferTexts(item, out);
  }

  return out;
}

/** CLOVA General OCR JSON → 단일 문자열 */
export function extractTextFromClovaResponse(body) {
  const images = body?.images;
  if (!Array.isArray(images) || images.length === 0) return '';

  const chunks = [];
  for (const img of images) {
    if (img.inferResult && img.inferResult !== 'SUCCESS') continue;

    const combined = String(img.combineResult?.text ?? '').trim();
    if (combined) {
      chunks.push(combined);
      continue;
    }

    const fields = img.fields;
    if (Array.isArray(fields) && fields.length > 0) {
      const parts = [];
      for (const f of fields) {
        const t = String(f.inferText ?? '').trim();
        if (t) parts.push(t);
      }
      if (parts.length) chunks.push(parts.join(' '));
      continue;
    }

    const texts = collectInferTexts(img);
    if (texts.length) chunks.push(texts.join(' '));
  }

  return chunks.join('\n').trim();
}

/**
 * 네이버 클라우드 CLOVA General OCR (API Gateway Invoke URL)
 * @see https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr
 */
export async function recognizeImageBuffer(buffer, { lang = 'ko' } = {}) {
  if (!buffer?.length) return '';

  const { invokeUrl, secret } = getOcrConfig();
  const format = detectImageFormat(buffer);
  const requestId = crypto.randomUUID();

  const payload = {
    version: 'V2',
    requestId,
    timestamp: Date.now(),
    lang,
    enableTableDetection: false,
    images: [
      {
        format,
        name: `student-id-${requestId.slice(0, 8)}`,
        data: buffer.toString('base64'),
      },
    ],
  };

  const res = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': secret,
    },
    body: JSON.stringify(payload),
  });

  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    const detail =
      body?.message ||
      body?.error ||
      body?.errorMessage ||
      res.statusText ||
      'unknown';
    throw new Error(`CLOVA OCR HTTP ${res.status}: ${detail}`);
  }

  const first = body?.images?.[0];
  if (first?.inferResult && first.inferResult !== 'SUCCESS') {
    throw new Error(
      `CLOVA OCR 인식 실패: ${first.message || first.inferResult}`,
    );
  }

  return extractTextFromClovaResponse(body);
}
