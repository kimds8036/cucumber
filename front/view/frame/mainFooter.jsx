import { MainFooterLegacy } from './mainFooterLegacy';

export { MainFooterLegacy } from './mainFooterLegacy';

/** Android와 그 외 플랫폼. iOS 네이티브 탭 바 모듈은 이 파일에서 불러오지 않는다. */
export const USES_NATIVE_TAB_BAR = false;

/** 메인 푸터를 하단에 둔 화면의 SafeAreaView edges */
export const MAIN_FOOTER_SAFE_AREA_EDGES = ['top', 'bottom'];

export default MainFooterLegacy;
