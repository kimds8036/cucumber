import { NativeTabBarView } from 'youth-paper-tab-bar';
import MainFooterIOS from './MainFooterIOS';
import { MainFooterLegacy } from './mainFooterLegacy';

export { MainFooterLegacy } from './mainFooterLegacy';

/** true면 탭 바가 하단 safe area까지 직접 채운다. 감싸는 SafeAreaView는 bottom edge를 빼야 한다. */
export const USES_NATIVE_TAB_BAR = !!NativeTabBarView;

/** 메인 푸터를 하단에 둔 화면의 SafeAreaView edges */
export const MAIN_FOOTER_SAFE_AREA_EDGES = USES_NATIVE_TAB_BAR
  ? ['top']
  : ['top', 'bottom'];

export default function MainFooter(props) {
  if (USES_NATIVE_TAB_BAR) {
    return <MainFooterIOS {...props} />;
  }
  return <MainFooterLegacy {...props} />;
}
