/**
 * FCM data payload 규격 (§8 #7)
 * @see docs/서비스_아키텍처_확장_및_컴포넌트_분리.md §8 #7
 */
export const FCM_PAYLOAD_FIELDS = Object.freeze({
  type: 'type',
  category: 'category',
  relatedType: 'relatedType',
  relatedId: 'relatedId',
  targetScreen: 'targetScreen',
});

export function resolveFcmTargetScreen(relatedType) {
  switch (relatedType) {
    case 'post':
      return 'BoardDetail';
    case 'dm_room':
      return 'DMChat';
    case 'message_room':
      return 'Chat';
    case 'personal_mail':
    case 'personal_mail_returned':
      return 'MailDetail';
    case 'school_mail':
      return 'SchoolMailDetail';
    case 'friend_request':
    case 'friendship':
      return 'FriendRequests';
    case 'timer_poke':
      return 'Timer';
    default:
      return 'Notifications';
  }
}

export function buildFcmDataPayload({
  type,
  category,
  relatedType,
  relatedId,
  extras = {},
}) {
  return {
    [FCM_PAYLOAD_FIELDS.type]: type || '',
    [FCM_PAYLOAD_FIELDS.category]: category || '',
    [FCM_PAYLOAD_FIELDS.relatedType]: relatedType || '',
    [FCM_PAYLOAD_FIELDS.relatedId]:
      relatedId != null ? String(relatedId) : '',
    [FCM_PAYLOAD_FIELDS.targetScreen]: resolveFcmTargetScreen(relatedType),
    ...Object.fromEntries(
      Object.entries(extras).map(([k, v]) => [String(k), String(v ?? '')]),
    ),
  };
}
