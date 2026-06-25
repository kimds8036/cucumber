const CATEGORY_TITLES = new Set(['게시글', '우편함', '시스템']);

const KNOWN_NOTIFICATION_PHRASES = [
  '댓글이 달렸',
  '답글이 달렸',
  '우편이 도착',
  '우편 답장',
  '반송',
  '친구 요청',
  '쿡 찔렀',
  '공부 완료',
  '기다렸',
];

function normalizeHonorificSpacing(text) {
  const raw = String(text ?? '');
  if (!raw) return raw;
  return raw
    .replace(/([^\s])님이/g, '$1 님이')
    .replace(/([^\s])님 외/g, '$1 님 외')
    .replace(/([^\s])님에게/g, '$1 님에게');
}

function resolveCategoryLabel(row) {
  const category = String(row?.category ?? '').trim();
  const type = String(row?.type ?? '').trim();
  if (category === 'post') return '게시글';
  if (category === 'mail') return '우편함';
  if (
    category === 'system' ||
    category === 'timer' ||
    type === 'poke' ||
    type === 'friend_request' ||
    type === 'study_finished_summary'
  ) {
    return '시스템';
  }
  return '시스템';
}

function isKnownNotificationPhrase(text) {
  const raw = String(text ?? '');
  return KNOWN_NOTIFICATION_PHRASES.some((phrase) => raw.includes(phrase));
}

function resolveLegacyBody(row) {
  const rawTitle = String(row?.title ?? '').trim();
  const rawBody = String(row?.content ?? row?.body ?? '').trim();
  const type = String(row?.type ?? '').trim();
  const relatedType = String(row?.relatedType ?? row?.related_type ?? '').trim();

  if (type === 'comment' || rawTitle.includes('게시글에 새로운 댓글')) {
    return '내 게시글에 새로운 댓글이 달렸어요';
  }
  if (type === 'reply' && rawTitle.includes('새 답글')) {
    return '내 댓글에 새 답글이 달렸어요';
  }
  if (type === 'reply' && rawTitle.includes('게시글에 새로운 댓글')) {
    return '내 게시글에 새로운 댓글이 달렸어요';
  }

  if (
    relatedType === 'personal_mail_returned' ||
    type === 'mail_returned' ||
    rawTitle.includes('반송') ||
    rawBody.includes('반송')
  ) {
    if (rawTitle.includes('님에게 보낸')) {
      return normalizeHonorificSpacing(rawTitle);
    }
    return '보낸 우편이 반송되었습니다';
  }

  if (relatedType === 'personal_mail' || type === 'mail') {
    if (rawTitle.includes('답장')) {
      return '우편 답장이 왔습니다';
    }
    return '새로운 우편이 도착했습니다';
  }

  if (type === 'friend_request' || rawTitle.includes('친구 요청')) {
    return '새 친구 요청이 도착했어요! 친구 목록에서 확인해 보세요';
  }

  if (type === 'poke' || relatedType === 'timer_poke' || rawTitle.includes('쿡 찔렀')) {
    const pokeName = rawTitle.replace(/ 님이? 쿡 찔렀어요.*$/u, '').trim();
    if (pokeName && pokeName !== rawTitle) {
      return `${pokeName} 님이 쿡 찔렀어요! 타이머에서 함께 공부를 시작해보세요`;
    }
    return '쿡 찔렀어요! 타이머에서 함께 공부를 시작해보세요';
  }

  if (
    type === 'study_finished_summary' ||
    rawTitle === '공부 완료' ||
    rawBody.includes('기다렸')
  ) {
    if (rawBody.startsWith('공부 완료')) return rawBody;
    if (rawBody) return `공부 완료! ${rawBody}`;
    return '공부 완료!';
  }

  if (rawTitle && rawBody && rawTitle !== rawBody && !isKnownNotificationPhrase(rawBody)) {
    return rawTitle;
  }

  return rawBody || rawTitle;
}

/** 알림 화면 표시용 title + content (구 형식 DB 데이터 호환) */
export function normalizeNotificationDisplay(row) {
  const rawTitle = String(row?.title ?? '').trim();

  if (CATEGORY_TITLES.has(rawTitle)) {
    return {
      title: rawTitle,
      content: normalizeHonorificSpacing(
        String(row?.content ?? row?.body ?? '').trim(),
      ),
    };
  }

  return {
    title: resolveCategoryLabel(row),
    content: normalizeHonorificSpacing(resolveLegacyBody(row)),
  };
}
