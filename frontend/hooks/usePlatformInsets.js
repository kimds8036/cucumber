import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function usePlatformInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    bottom: insets.bottom > 0 ? insets.bottom : 16,
    left: insets.left,
    right: insets.right,
  };
}
