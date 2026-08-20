import { useEffect } from 'react';
import { Linking } from 'react-native';
import { persistInviteCodeFromUrl } from '../utils/inviteReferral';

/** 로그인 전후 공통: youthpaper://invite?ref= 코드를 가입 전까지 보관 */
export default function InviteDeepLinkListener() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        if (!cancelled && initial) await persistInviteCodeFromUrl(initial);
      } catch {
        // ignore
      }
    })();
    const sub = Linking.addEventListener('url', ({ url }) => {
      persistInviteCodeFromUrl(url).catch(() => {});
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  return null;
}
