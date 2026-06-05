import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { navigate } from '../navigation/navigationRef';

const ToastContext = createContext(null);
const ENABLE_NATIVE_CHAT_BRIDGE = false;

export function ToastProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState({
    id: 0,
    message: '',
    senderName: null,
    body: null,
    roomId: null,
    relatedType: null,
    relatedId: null,
    type: null,
    category: null,
    isChat: false,
    showProgress: false,
    watchers: [],
    senderUserId: null,
    senderSchoolName: null,
    senderColorId: null,
  });
  const [activeChatRoomId, setActiveChatRoomIdState] = useState(null);
  const [isMessageTab, setIsMessageTab] = useState(false);
  const [isTimerScreenActive, setIsTimerScreenActive] = useState(false);
  const hideTimerRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearHideTimer();
    setVisible(false);
  }, [clearHideTimer]);

  const showToast = useCallback(
    (input) => {
      const next =
        typeof input === 'string' ? { message: input } : (input ?? {});
      const text = String(next.message ?? '').trim();
      if (!text) return;

      clearHideTimer();
      const nextId = Date.now();
      const senderName =
        next.senderName != null && String(next.senderName).trim() !== ''
          ? String(next.senderName).trim()
          : null;
      const body =
        next.body != null && String(next.body).trim() !== ''
          ? String(next.body).trim()
          : null;
      setToast({
        id: nextId,
        message: text,
        senderName,
        body,
        roomId:
          next.roomId != null && next.roomId !== ''
            ? String(next.roomId)
            : null,
        relatedType: next.relatedType ?? null,
        relatedId:
          next.relatedId != null && next.relatedId !== ''
            ? String(next.relatedId)
            : null,
        type: next.type ?? null,
        category: next.category ?? null,
        isChat: Boolean(next.isChat),
        showProgress: Boolean(next.showProgress),
        watchers: Array.isArray(next.watchers) ? next.watchers : [],
        senderUserId:
          next.senderUserId != null && next.senderUserId !== ''
            ? String(next.senderUserId)
            : null,
        senderSchoolName:
          next.senderSchoolName != null &&
          String(next.senderSchoolName).trim() !== ''
            ? String(next.senderSchoolName).trim()
            : null,
        senderColorId:
          next.senderColorId != null &&
          Number.isFinite(Number(next.senderColorId))
            ? Number(next.senderColorId)
            : null,
      });
      setVisible(true);
      console.log('[ToastSystem] Triggered:', {
        message: text,
        roomId: next.roomId ?? null,
        relatedType: next.relatedType ?? null,
        relatedId: next.relatedId ?? null,
        type: next.type ?? null,
        category: next.category ?? null,
        isChat: Boolean(next.isChat),
      });

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 3000);
    },
    [clearHideTimer],
  );

  const setActiveChatRoomId = useCallback((roomId) => {
    setActiveChatRoomIdState(
      roomId != null && roomId !== '' ? String(roomId) : null,
    );
  }, []);

  /** Android 네이티브 채팅(ChatLauncherActivity) 포그라운드 시 RN 토스트/알림 억제와 동기화 */
  useEffect(() => {
    if (Platform.OS !== 'android' || !ENABLE_NATIVE_CHAT_BRIDGE)
      return undefined;
    const sub = DeviceEventEmitter.addListener(
      'nativeChatActiveRoom',
      (payload) => {
        const rid = payload?.roomId;
        setActiveChatRoomId(
          rid != null && String(rid).trim() !== '' ? String(rid).trim() : null,
        );
      },
    );
    return () => sub.remove();
  }, [setActiveChatRoomId]);

  /** 네이티브 쪽지방 상단 게시글 카드 탭 → BoardDetail (ChatScreen과 동일 파라미터) */
  useEffect(() => {
    if (Platform.OS !== 'android' || !ENABLE_NATIVE_CHAT_BRIDGE)
      return undefined;
    console.log('[NativeOpenBoardDetail] listener registered');
    const sub = DeviceEventEmitter.addListener(
      'nativeOpenBoardDetail',
      (payload) => {
        const postId = payload?.postId;
        console.log('[NativeOpenBoardDetail] event received', { postId });
        if (postId == null || String(postId).trim() === '') return;
        console.log('[NativeOpenBoardDetail] navigate BoardDetail', {
          postId: String(postId).trim(),
        });
        navigate('BoardDetail', {
          post: { id: String(postId).trim() },
          isMyPost: false,
        });
      },
    );
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({
      visible,
      toast,
      showToast,
      hideToast,
      activeChatRoomId,
      setActiveChatRoomId,
      isMessageTab,
      setIsMessageTab,
      isTimerScreenActive,
      setIsTimerScreenActive,
    }),
    [
      visible,
      toast,
      showToast,
      hideToast,
      activeChatRoomId,
      setActiveChatRoomId,
      isMessageTab,
      setIsMessageTab,
      isTimerScreenActive,
      setIsTimerScreenActive,
    ],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
