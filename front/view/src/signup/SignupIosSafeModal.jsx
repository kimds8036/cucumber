import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';

/**
 * iOS에서 Modal을 즉시 언마운트하면 투명 터치 차단 레이어가 남을 수 있어,
 * visible=false 애니메이션 완료(onDismiss) 후에만 언마운트한다.
 */
const SignupIosSafeModal = ({
  visible,
  children,
  onDismiss,
  onDismissed,
  ...modalProps
}) => {
  const [mounted, setMounted] = useState(visible);
  const dismissedRef = useRef(false);

  const finishDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (visible) {
      dismissedRef.current = false;
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (visible || !mounted) return undefined;
    const timer = setTimeout(finishDismiss, 500);
    return () => clearTimeout(timer);
  }, [visible, mounted, finishDismiss]);

  if (!mounted) return null;

  const handleDismiss = () => {
    if (!visible) finishDismiss();
    onDismiss?.();
  };

  return (
    <Modal visible={visible} onDismiss={handleDismiss} {...modalProps}>
      {children}
    </Modal>
  );
};

export default SignupIosSafeModal;
