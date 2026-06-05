import { api } from './api';

/** 백엔드 반송 기간(일) — UI 문구·주석용 */
export const PERSONAL_MAIL_RETURN_DAYS = 1;

/** 테스트용: true면 보낸 우편·반송 알림 UI를 즉시 확인 가능 (배포 전 false) */
export const PERSONAL_MAIL_TEST_IMMEDIATE_RETURN = false;

const TEST_RETURNED_NOTIFICATION_ID = 'dev-personal-mail-returned';

/** 반송 알림 제목 — TODO: DB 연동 후 서버의 recipient_name 등으로 치환 */
export function buildMailReturnedNotificationTitle(recipientName) {
  const name = String(recipientName ?? '').trim();
  if (name) return `${name}에게 보낸 우편이 반송되었습니다`;
  return '우편이 반송되었습니다';
}

/** 알림/우편 객체에서 수신인 표시 이름 추출 (DB 필드 확정 전 호환) */
export function getRecipientNameForReturnedNotification(source) {
  const m = source?.raw ?? source ?? {};
  const meta = source?.prefillMeta ?? m.prefill ?? m.return_prefill ?? {};
  return String(
    meta.name ??
      meta.recipient_name ??
      m.recipient_name ??
      m.recipientName ??
      source?.recipientName ??
      '',
  ).trim();
}

/** 알림 탭 반송 UI 테스트용 목 알림 (테스트 플래그가 켜져 있을 때만) */
export function getTestReturnedMailNotification() {
  if (!PERSONAL_MAIL_TEST_IMMEDIATE_RETURN) return null;
  const recipientName = '홍길동';
  return {
    id: TEST_RETURNED_NOTIFICATION_ID,
    type: 'mail_returned',
    category: 'mail',
    title: buildMailReturnedNotificationTitle(recipientName),
    content: `${recipientName}에게 보낸 우편이 반송되었습니다.`,
    time: '방금 전',
    createdAt: new Date().toISOString(),
    isRead: false,
    icon: 'mail',
    iconColor: '#888',
    iconBg: '#eee',
    relatedType: 'personal_mail_returned',
    relatedId: 0,
    watchers: [],
    isReturned: true,
    prefillMeta: {
      grade: '2',
      class_number: '3',
      name: '홍길동',
      content: '테스트 우편 본문입니다.',
    },
  };
}

export function mergeTestReturnedMailNotification(items) {
  const mock = getTestReturnedMailNotification();
  if (!mock) return items;
  const hasMock = items.some(
    (n) => String(n.id) === TEST_RETURNED_NOTIFICATION_ID,
  );
  if (hasMock) return items;
  return [mock, ...items];
}

/** 개인우편 반송 여부 (백엔드 필드명 확정 전 호환) */
export function isPersonalMailReturned(mailOrRaw) {
  const m = mailOrRaw?.raw ?? mailOrRaw;
  if (!m) return false;

  if (m.is_returned || m.isReturned || m.returned) return true;
  if (String(m.status || '').toLowerCase() === 'returned') return true;
  if (String(m.return_status || '').toLowerCase() === 'returned') return true;

  // 테스트: 보낸 우편은 전송 직후 반송된 것으로 표시
  if (PERSONAL_MAIL_TEST_IMMEDIATE_RETURN) {
    const isReceived = m._isReceived === true || m.isReceived === true;
    if (!isReceived) return true;
  }

  return false;
}

/** 알림 행이 반송 알림인지 */
export function isMailReturnedNotification(n) {
  if (!n) return false;
  if (n.isReturned || n.is_returned) return true;
  if (
    n.type === 'mail_returned' ||
    n.relatedType === 'personal_mail_returned'
  ) {
    return true;
  }
  if (PERSONAL_MAIL_TEST_IMMEDIATE_RETURN) {
    if (String(n.id) === TEST_RETURNED_NOTIFICATION_ID) return true;
    if (
      n.category === 'mail' &&
      /반송/.test(`${n.title || ''}${n.content || ''}`)
    ) {
      return true;
    }
  }
  return false;
}

/** 우편 작성 화면 prefill 객체 */
/** GET /api/mails/personal/:id/retry 응답 → SendMail prefill */
export function mapRetryApiToPrefill(data) {
  if (!data) return buildSendMailPrefill({});
  const schoolId = data.school_id ?? data.schoolId;
  return {
    school: schoolId
      ? {
          id: schoolId,
          name: String(data.school_name ?? data.schoolName ?? '').trim(),
        }
      : null,
    grade: String(data.grade ?? ''),
    classNumber: String(data.class_num ?? data.classNumber ?? ''),
    name: String(data.name ?? ''),
    content: String(data.content ?? ''),
    recipientUsername: String(data.user_id ?? data.recipientUsername ?? ''),
  };
}

export function buildSendMailPrefill(source) {
  const m = source?.raw ?? source ?? {};
  const meta = source?.prefillMeta ?? m.prefill ?? m.return_prefill ?? {};

  const schoolFromMeta = meta.school;
  const school =
    schoolFromMeta && (schoolFromMeta.id || schoolFromMeta.name)
      ? schoolFromMeta
      : m.recipient_school_id || m.recipient_school_name
        ? {
            id: m.recipient_school_id ?? null,
            name: m.recipient_school_name ?? '',
            region: m.recipient_school_region ?? '',
          }
        : null;

  return {
    school,
    grade: String(meta.grade ?? m.recipient_grade ?? m.grade ?? ''),
    classNumber: String(
      meta.class_number ??
        meta.classNumber ??
        m.recipient_class ??
        m.class_number ??
        m.class ??
        '',
    ),
    name: String(
      meta.name ??
        meta.recipient_name ??
        m.recipient_name ??
        source?.senderName ??
        '',
    ),
    content: String(meta.content ?? m.content ?? source?.previewText ?? ''),
    recipientUsername: String(
      meta.recipient_username ??
        meta.recipientUsername ??
        m.recipient_username ??
        '',
    ),
  };
}

export async function navigateToResendPersonalMail(navigation, source) {
  const mailId = Number(
    source?.relatedId ?? source?.raw?.id ?? source?.id ?? 0,
  );
  if (Number.isFinite(mailId) && mailId > 0) {
    try {
      const res = await api.get(`/api/mails/personal/${mailId}/retry`);
      const data = res.data?.data;
      if (data) {
        navigation?.navigate?.('SendMail', {
          prefill: mapRetryApiToPrefill(data),
        });
        return;
      }
    } catch {
      // 알림 prefill 등으로 폴백
    }
  }
  navigation?.navigate?.('SendMail', {
    prefill: buildSendMailPrefill(source),
  });
}
