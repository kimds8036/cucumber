const getMessageSortValue = (msg) => {
  if (!msg) return Number.MIN_SAFE_INTEGER;
  const idNum = Number(msg.id);
  if (!Number.isNaN(idNum)) return idNum;
  const t = Date.parse(msg.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number.MIN_SAFE_INTEGER;
};

const getSortedUniqueIds = (ids, messagesById) => {
  const unique = Array.from(new Set(ids));
  // 정렬 결과: index 0 이 가장 "과거" (정렬값이 작은) 메시지
  unique.sort(
    (a, b) =>
      getMessageSortValue(messagesById[a]) - getMessageSortValue(messagesById[b]),
  );
  return unique;
};

export const initialState = {
  messagesById: {},
  messageIds: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
};

export function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_MESSAGES': {
      const { messages, hasMore } = action.payload;
      const messagesById = {};
      const messageIds = [];

      messages.forEach((msg) => {
        messagesById[msg.id] = msg;
        messageIds.push(msg.id);
      });

      const sortedIds = getSortedUniqueIds(messageIds, messagesById);

      return {
        ...state,
        messagesById,
        messageIds: sortedIds,
        hasMore,
        isLoading: false,
      };
    }

    case 'ADD_MESSAGES_PREPEND': {
      const { messages } = action.payload;
      const newById = { ...state.messagesById };
      const newIds = [];

      messages.forEach((msg) => {
        if (!newById[msg.id]) {
          newById[msg.id] = msg;
          newIds.push(msg.id);
        }
      });

      const mergedIds = getSortedUniqueIds(
        [...newIds, ...state.messageIds],
        newById,
      );

      return {
        ...state,
        messagesById: newById,
        messageIds: mergedIds,
        isLoadingMore: false,
      };
    }

    case 'ADD_MESSAGE': {
      const msg = action.payload;
      const messagesById = {
        ...state.messagesById,
        [msg.id]: msg,
      };
      const mergedIds = getSortedUniqueIds(
        [...state.messageIds, msg.id],
        messagesById,
      );
      return {
        ...state,
        messagesById,
        messageIds: mergedIds,
      };
    }

    case 'UPDATE_MESSAGE': {
      const { id, updates } = action.payload;
      const before = state.messagesById[id];
      if (!before) return state;

      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [id]: { ...before, ...updates },
        },
      };
    }

    case 'REPLACE_TEMP_MESSAGE': {
      const { tempId, serverMessage } = action.payload;
      if (!state.messagesById[tempId]) return state;

      const tempMsg = state.messagesById[tempId];
      const { [tempId]: _removed, ...restById } = state.messagesById;
      const messagesById = {
        ...restById,
        [serverMessage.id]: {
          ...serverMessage,
          parent_message_id:
            serverMessage.parent_message_id ??
            tempMsg.parent_message_id ??
            null,
          parent_content:
            serverMessage.parent_content ?? tempMsg.parent_content ?? null,
          parent_sender_name:
            serverMessage.parent_sender_name ??
            tempMsg.parent_sender_name ??
            null,
          status: 'sent',
          isSending: false,
          isFailed: false,
        },
      };
      const replacedIds = state.messageIds.map((id) =>
        id === tempId ? serverMessage.id : id,
      );
      const sortedIds = getSortedUniqueIds(replacedIds, messagesById);

      return {
        ...state,
        messagesById,
        messageIds: sortedIds,
      };
    }

    case 'DELETE_MESSAGE': {
      const { id } = action.payload;
      const newById = { ...state.messagesById };
      delete newById[id];
      return {
        ...state,
        messagesById: newById,
        messageIds: state.messageIds.filter((mid) => mid !== id),
      };
    }

    case 'MARK_ALL_READ': {
      const newById = { ...state.messagesById };
      Object.keys(newById).forEach((id) => {
        const msg = newById[id];
        if (msg && !msg.isMe) {
          newById[id] = { ...msg, isReadByMe: true };
        }
      });
      return { ...state, messagesById: newById };
    }

    case 'MARK_MY_READ': {
      const newById = { ...state.messagesById };
      Object.keys(newById).forEach((id) => {
        const msg = newById[id];
        if (msg?.isMe) {
          newById[id] = { ...msg, isReadByOther: true };
        }
      });
      return { ...state, messagesById: newById };
    }

    case 'MERGE_POLL_MESSAGES': {
      const { messages } = action.payload;
      const newById = { ...state.messagesById };
      const newIds = [...state.messageIds];

      messages.forEach((msg) => {
        const existing = newById[msg.id];
        if (existing && (existing.isSending || existing.isFailed)) return;
        newById[msg.id] = msg;
        newIds.push(msg.id);
      });

      const sortedIds = getSortedUniqueIds(newIds, newById);

      return { ...state, messagesById: newById, messageIds: sortedIds };
    }

    case 'TRIM_MESSAGES': {
      const limit = action.payload;
      const ids = state.messageIds.slice(-limit);
      const newById = {};
      ids.forEach((id) => {
        if (state.messagesById[id]) newById[id] = state.messagesById[id];
      });
      return { ...state, messageIds: ids, messagesById: newById };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: action.payload };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };

    case 'RESET':
      return { ...initialState, isLoading: true };

    default:
      return state;
  }
}
