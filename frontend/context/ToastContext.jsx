import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState({
    id: 0,
    message: '',
    roomId: null,
    relatedType: null,
    isChat: false,
  });
  const [activeChatRoomId, setActiveChatRoomIdState] = useState(null);
  const [isMessageTab, setIsMessageTab] = useState(false);
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
        typeof input === 'string'
          ? { message: input }
          : (input ?? {});
      const text = String(next.message ?? '').trim();
      if (!text) return;

      clearHideTimer();
      const nextId = Date.now();
      setToast({
        id: nextId,
        message: text,
        roomId:
          next.roomId != null && next.roomId !== ''
            ? String(next.roomId)
            : null,
        relatedType: next.relatedType ?? null,
        isChat: Boolean(next.isChat),
      });
      setVisible(true);
      console.log('[ToastSystem] Triggered:', {
        message: text,
        roomId: next.roomId ?? null,
        relatedType: next.relatedType ?? null,
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
    ],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

