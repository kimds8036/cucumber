import { useCallback, useRef, useState } from 'react';

export default function useChatUI() {
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [longPressMenu, setLongPressMenu] = useState(null);
  const [viewerUri, setViewerUri] = useState(null);
  const [toastText, setToastText] = useState('');
  const toastTimerRef = useRef(null);

  const openLongPressMenu = useCallback((msg, anchor) => {
    setLongPressMenu({ msg, anchor });
  }, []);

  const showChatToast = useCallback((text) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastText('');
    }, 2000);
  }, []);

  return {
    replyToMessage,
    setReplyToMessage,
    longPressMenu,
    setLongPressMenu,
    openLongPressMenu,
    viewerUri,
    setViewerUri,
    toastText,
    showChatToast,
  };
}
