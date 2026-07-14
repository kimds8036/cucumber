import express from 'express';
import {
  getLegalDocumentBySlug,
  normalizeLegalSlug,
  isLegalDocumentSlug,
} from '../services/legalDocuments.service.js';

const router = express.Router();

router.get('/:slug', async (req, res) => {
  try {
    const slug = normalizeLegalSlug(req.params.slug);
    if (!isLegalDocumentSlug(slug)) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',
      });
    }

    const doc = await getLegalDocumentBySlug(slug);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',
      });
    }

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('[legal] 문서 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '문서 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
