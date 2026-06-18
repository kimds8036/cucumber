import React from 'react';
import Svg, { Circle, Rect, G, Defs, ClipPath } from 'react-native-svg';
import { colors } from '../../../../styles/colors';
import { CLOUD_PUFFS, CLOUD_BODY_X, CLOUD_BODY_Y, CLOUD_BODY_WIDTH, CLOUD_BODY_RX, getTailCircles } from './cloudBubbleLayout';

export default function CloudBubbleGraphic({
  width,
  height,
  viewBoxWidth,
  viewBoxHeight,
  bodyHeightViewBox,
  bodyBottomViewBox,
}) {
  const tails = getTailCircles(bodyBottomViewBox);
  const puffStrokeClipHeight = CLOUD_BODY_Y + 4;
  const tailStrokeClipY = bodyBottomViewBox - 2;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      <Defs>
        <ClipPath id="cloudPuffStrokeClip">
          <Rect x="0" y="0" width={viewBoxWidth} height={puffStrokeClipHeight} />
        </ClipPath>
        <ClipPath id="cloudTailStrokeClip">
          <Rect
            x="0"
            y={tailStrokeClipY}
            width={viewBoxWidth}
            height={viewBoxHeight - tailStrokeClipY}
          />
        </ClipPath>
      </Defs>

      {CLOUD_PUFFS.map((puff, index) => (
        <Circle
          key={`puff-fill-${index}`}
          cx={puff.cx}
          cy={puff.cy}
          r={puff.r}
          fill={colors.background}
        />
      ))}

      <Rect
        x={CLOUD_BODY_X}
        y={CLOUD_BODY_Y}
        width={CLOUD_BODY_WIDTH}
        height={bodyHeightViewBox}
        rx={CLOUD_BODY_RX}
        fill={colors.background}
      />

      {tails.map((tail, index) => (
        <Circle
          key={`tail-fill-${index}`}
          cx={tail.cx}
          cy={tail.cy}
          r={tail.r}
          fill={colors.background}
        />
      ))}

      <G clipPath="url(#cloudPuffStrokeClip)">
        {CLOUD_PUFFS.map((puff, index) => (
          <Circle
            key={`puff-stroke-${index}`}
            cx={puff.cx}
            cy={puff.cy}
            r={puff.r}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
          />
        ))}
      </G>

      <Rect
        x={CLOUD_BODY_X}
        y={CLOUD_BODY_Y}
        width={CLOUD_BODY_WIDTH}
        height={bodyHeightViewBox}
        rx={CLOUD_BODY_RX}
        fill="none"
        stroke={colors.primary}
        strokeWidth={2}
      />

      <G clipPath="url(#cloudTailStrokeClip)">
        {tails.map((tail, index) => (
          <Circle
            key={`tail-stroke-${index}`}
            cx={tail.cx}
            cy={tail.cy}
            r={tail.r}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
          />
        ))}
      </G>
    </Svg>
  );
}
