import express from 'express';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import {
  getLegalDocumentBySlug,
  getLegalDocumentRevision,
  listLegalDocuments,
  listLegalDocumentRevisions,
  normalizeLegalSlug,
  isLegalDocumentSlug,
  updateLegalDocument,
} from '../services/legalDocuments.service.js';

const router = express.Router();

router.get(
  '/',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER),
  async (_req, res) => {
    try {
      const documents = await listLegalDocuments();
      return res.json({ success: true, data: { documents } });
    } catch (error) {
      console.error('[admin/legal] 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '법적 문서 목록 조회 실패',
      });
    }
  },
);

router.get(
  '/:slug/revisions',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER),
  async (req, res) => {
    try {
      const slug = normalizeLegalSlug(req.params.slug);
      if (!isLegalDocumentSlug(slug)) {
        return res.status(404).json({
          success: false,
          message: '문서를 찾을 수 없습니다.',
        });
      }

      const revisions = await listLegalDocumentRevisions(slug, {
        limit: req.query?.limit,
      });
      return res.json({ success: true, data: { revisions } });
    } catch (error) {
      console.error('[admin/legal] 이력 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '법적 문서 이력 조회 실패',
      });
    }
  },
);

router.get(
  '/:slug/revisions/:revisionId',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER),
  async (req, res) => {
    try {
      const slug = normalizeLegalSlug(req.params.slug);
      const revision = await getLegalDocumentRevision(slug, req.params.revisionId);
      if (!revision) {
        return res.status(404).json({
          success: false,
          message: '이력을 찾을 수 없습니다.',
        });
      }

      return res.json({ success: true, data: revision });
    } catch (error) {
      console.error('[admin/legal] 이력 상세 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '법적 문서 이력 조회 실패',
      });
    }
  },
);

router.get(
  '/:slug',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER),
  async (req, res) => {
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
      console.error('[admin/legal] 문서 조회 오류:', error);
      return res.status(500).json({
        success: false,
        message: '법적 문서 조회 실패',
      });
    }
  },
);

router.patch(
  '/:slug',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPER),
  async (req, res) => {
    try {
      const slug = normalizeLegalSlug(req.params.slug);
      if (!isLegalDocumentSlug(slug)) {
        return res.status(404).json({
          success: false,
          message: '문서를 찾을 수 없습니다.',
        });
      }

      const doc = await updateLegalDocument({
        slug,
        title: req.body?.title,
        version: req.body?.version,
        contentMd: req.body?.contentMd ?? req.body?.content_md,
        updatedByAdminId: req.user.userId,
      });

      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'legal_document_update',
        targetType: 'legal_document',
        targetId: 0,
        note: `slug=${slug}, version=${doc.version}`,
        extra: { slug, version: doc.version },
      });

      return res.json({
        success: true,
        data: doc,
        message: '문서가 저장되었습니다.',
      });
    } catch (error) {
      if (error?.code === 'LEGAL_FIELDS_REQUIRED') {
        return res.status(400).json({
          success: false,
          message: '제목, 버전, 본문을 모두 입력해 주세요.',
        });
      }
      if (error?.code === 'LEGAL_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: '문서를 찾을 수 없습니다.',
        });
      }
      console.error('[admin/legal] 문서 저장 오류:', error);
      return res.status(500).json({
        success: false,
        message: '법적 문서 저장 실패',
      });
    }
  },
);

export default router;
