import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';

/**
 * iOS에서 Modal을 즉시 언마운트하면 투명 터치 차단 레이어가 남을 수 있어,
 * visible=false 애니메이션 완료(onDismiss) 후에만 언마운트한다.
 */
const SignupIosSafeModal = ({ visible, children, onDismiss, ...modalProps }) => {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (visible || !mounted) return undefined;
    const timer = setTimeout(() => setMounted(false), 500);
    return () => clearTimeout(timer);
  }, [visible, mounted]);

  if (!mounted) return null;

  const handleDismiss = () => {
    if (!visible) setMounted(false);
    onDismiss?.();
  };

  return (
    <Modal visible={visible} onDismiss={handleDismiss} {...modalProps}>
      {children}
    </Modal>
  );
};

export default SignupIosSafeModal;
