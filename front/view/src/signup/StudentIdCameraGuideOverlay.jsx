import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../styles/colors';
import {
  STUDENT_ID_CAMERA_OVERLAY_VIEW_PROPS,
} from '../../../styles/studentIdCameraLayers';

/** OCR crop·UI 가이드 틀 — studentIdFrameCrop 와 동일 */
export const STUDENT_ID_GUIDE_BORDER_WIDTH = 2;
export const STUDENT_ID_GUIDE_CORNER_RADIUS = 16;

const DIM_BG = colors.overlayDark;

/** even-odd 딤 + 둥근 구멍 (틀과 동일 rx) */
function buildRoundedDimPath(stageW, stageH, holeX, holeY, holeW, holeH, radius) {
  const r = Math.min(radius, holeW / 2, holeH / 2);
  const outer = `M0 0H${stageW}V${stageH}H0Z`;
  const hole = [
    `M${holeX + r} ${holeY}`,
    `H${holeX + holeW - r}`,
    `A${r} ${r} 0 0 1 ${holeX + holeW} ${holeY + r}`,
    `V${holeY + holeH - r}`,
    `A${r} ${r} 0 0 1 ${holeX + holeW - r} ${holeY + holeH}`,
    `H${holeX + r}`,
    `A${r} ${r} 0 0 1 ${holeX} ${holeY + holeH - r}`,
    `V${holeY + r}`,
    `A${r} ${r} 0 0 1 ${holeX + r} ${holeY}`,
    'Z',
  ].join(' ');
  return outer + hole;
}

/**
 * CameraView 형제 오버레이 — 둥근 딤 + 중앙 틀
 */
export default function StudentIdCameraGuideOverlay({
  stageWidth,
  stageHeight,
  frameWidth,
  frameHeight,
  statusText,
  guideTextStyle,
  overlayRootStyle,
  layerStyles,
}) {
  const left = Math.max(0, (stageWidth - frameWidth) / 2);
  const top = Math.max(0, (stageHeight - frameHeight) / 2);
  const w = Math.max(1, stageWidth);
  const h = Math.max(1, stageHeight);

  const dimPath = useMemo(
    () =>
      buildRoundedDimPath(
        w,
        h,
        left,
        top,
        frameWidth,
        frameHeight,
        STUDENT_ID_GUIDE_CORNER_RADIUS,
      ),
    [w, h, left, top, frameWidth, frameHeight],
  );

  return (
    <View
      style={[styles.overlayRoot, overlayRootStyle]}
      pointerEvents="none"
      {...STUDENT_ID_CAMERA_OVERLAY_VIEW_PROPS}
    >
      <Svg width={w} height={h} style={styles.dimSvg}>
        <Path d={dimPath} fill={DIM_BG} fillRule="evenodd" />
      </Svg>

      <View
        style={[
          styles.frame,
          layerStyles?.guideFrame,
          {
            left,
            top,
            width: frameWidth,
            height: frameHeight,
          },
        ]}
      />

      <View style={[styles.hintWrap, layerStyles?.guideHint]}>
        {statusText ? <Text style={guideTextStyle}>{statusText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  dimSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  frame: {
    position: 'absolute',
    elevation: 0,
    backgroundColor: 'transparent',
    borderWidth: STUDENT_ID_GUIDE_BORDER_WIDTH,
    borderColor: colors.primary,
    borderRadius: STUDENT_ID_GUIDE_CORNER_RADIUS,
  },
  hintWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
