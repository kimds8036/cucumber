import React, { memo } from 'react';
import LegacyMessageItem from '../../components/chat/MessageItem';

function MessageItem(props) {
  return <LegacyMessageItem {...props} />;
}

export default memo(MessageItem, (prev, next) => {
  const a = prev.msg;
  const b = next.msg;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.isSending === b.isSending &&
    a.isFailed === b.isFailed &&
    a.is_deleted === b.is_deleted &&
    a.content === b.content &&
    a.isReadByOther === b.isReadByOther &&
    a.showProfile === b.showProfile &&
    a.showTimestamp === b.showTimestamp &&
    a.images?.length === b.images?.length
  );
});
