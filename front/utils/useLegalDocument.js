import { useEffect, useState } from 'react';
import { api } from './api';
import { stripLegalDocumentPreamble } from './legalDocumentDisplay';

/**
 * 서버 legal_documents API에서 마크다운 본문을 가져옵니다.
 * 제목·버전·제정일·시행일은 DB 컬럼(updated_at) 기준이며 본문 메타는 제거합니다.
 * 실패 시 번들 fallback을 그대로 사용합니다.
 */
export function useLegalDocument(slug, fallbackMarkdown = '') {
  const [markdown, setMarkdown] = useState(
    stripLegalDocumentPreamble(fallbackMarkdown),
  );
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get(`/api/legal/${slug}`);
        const doc = res.data?.data;
        if (!mounted || !doc?.contentMd) return;
        setMarkdown(stripLegalDocumentPreamble(doc.contentMd));
        setMeta({
          title: doc.title,
          version: doc.version,
          updatedAt: doc.updatedAt,
          enactedAt: doc.enactedAt,
          effectiveAt: doc.effectiveAt,
        });
      } catch (error) {
        console.warn(`[legal] ${slug} API 로드 실패, 번들 fallback 사용:`, error?.message);
        if (mounted) {
          setMarkdown(stripLegalDocumentPreamble(fallbackMarkdown));
          setMeta(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, fallbackMarkdown]);

  return { markdown, meta, loading };
}
