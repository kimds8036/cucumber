import { Platform, StyleSheet } from 'react-native';
import { colors } from './colors';

/** Android·iOS 공통 — 카메라 프리뷰 / 가이드 오버레이 z-order */
const ABSOLUTE_FILL = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

const androidLayer = Platform.OS === 'android';

/**
 * 학생증 OCR 카메라 스택 레이어 (login.style createSignupStyles 와 함께 사용)
 */
export function createStudentIdCameraLayerStyles() {
  return StyleSheet.create({
    stageStack: {
      flex: 1,
      width: '100%',
      position: 'relative',
      backgroundColor: 'transparent',
      overflow: 'hidden',
      ...(androidLayer ? { elevation: 0 } : null),
    },
    preview: {
      ...ABSOLUTE_FILL,
      zIndex: 0,
      backgroundColor: 'transparent',
      ...(androidLayer ? { elevation: 0 } : null),
    },
    guideOverlay: {
      ...ABSOLUTE_FILL,
      zIndex: 1,
      backgroundColor: 'transparent',
      ...(androidLayer ? { elevation: 0 } : null),
    },
    guideDim: {
      position: 'absolute',
      backgroundColor: colors.overlayDark,
      ...(androidLayer ? { elevation: 0 } : null),
    },
    guideFrame: {
      position: 'absolute',
      backgroundColor: 'transparent',
      ...(androidLayer ? { elevation: 0 } : null),
    },
    guideHint: {
      position: 'absolute',
      backgroundColor: 'transparent',
      ...(androidLayer ? { elevation: 0 } : null),
    },
  });
}

/** 오버레이 루트 View — 하드웨어 텍스처 레이어 분리 방지 */
export const STUDENT_ID_CAMERA_OVERLAY_VIEW_PROPS = androidLayer
  ? {
      collapsable: false,
      renderToHardwareTextureAndroid: false,
    }
  : {
      collapsable: false,
    };

export const STUDENT_ID_CAMERA_PREVIEW_VIEW_PROPS = androidLayer
  ? { collapsable: false }
  : { collapsable: false };
