import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CHAT_CACHE_SAVE_LIMIT,
  CHAT_CACHE_TTL_MS,
  CHAT_INITIAL_FETCH_LIMIT,
} from '../constants/chatConfig';

const getCacheKey = (scope, roomId) => `${scope}_chat_cache_${roomId}`;

export async function loadCache(scope, roomId) {
  if (!roomId) return null;
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(scope, roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - Number(parsed.cachedAt || 0) > CHAT_CACHE_TTL_MS)
      return null;

    const allIds = Array.isArray(parsed.messageIds) ? parsed.messageIds : [];
    const allById = parsed.messagesById || {};

    const slicedIds =
      allIds.length > CHAT_INITIAL_FETCH_LIMIT
        ? allIds.slice(-CHAT_INITIAL_FETCH_LIMIT)
        : allIds;
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (allById[id]) slicedById[id] = allById[id];
    });

    return {
      messagesById: slicedById,
      messageIds: slicedIds,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

export async function saveCache(scope, roomId, messagesById, messageIds) {
  if (!roomId) return;
  try {
    const ids = Array.isArray(messageIds) ? messageIds : [];
    const byId = messagesById || {};

    const slicedIds =
      ids.length > CHAT_CACHE_SAVE_LIMIT
        ? ids.slice(-CHAT_CACHE_SAVE_LIMIT)
        : ids;
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (byId[id]) slicedById[id] = byId[id];
    });

    await AsyncStorage.setItem(
      getCacheKey(scope, roomId),
      JSON.stringify({
        messageIds: slicedIds,
        messagesById: slicedById,
        cachedAt: Date.now(),
      }),
    );
  } catch (e) {
    console.error('[cacheManager] 캐시 저장 오류:', e);
  }
}
