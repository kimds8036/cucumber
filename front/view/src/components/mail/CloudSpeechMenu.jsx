import React, { Fragment, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import CloudBubbleGraphic from './CloudBubbleGraphic';
import {
  CLOUD_VIEWBOX_WIDTH,
  computeCloudMetrics,
} from './cloudBubbleLayout';

export default function CloudSpeechMenu({
  styles,
  normalize,
  options,
  onSelect,
}) {
  const metrics = useMemo(
    () => computeCloudMetrics(normalize, options.length),
    [normalize, options.length],
  );

  const cloudRootStyle = useMemo(
    () => [
      styles.cloudRoot,
      { width: metrics.cloudWidth, height: metrics.cloudHeight },
    ],
    [styles.cloudRoot, metrics.cloudWidth, metrics.cloudHeight],
  );

  const cloudMenuContentStyle = useMemo(
    () => [
      styles.cloudMenuContent,
      {
        paddingTop: metrics.contentPaddingTop,
        paddingBottom: metrics.contentPaddingBottom,
        paddingHorizontal: metrics.contentPaddingHorizontal,
      },
    ],
    [
      styles.cloudMenuContent,
      metrics.contentPaddingTop,
      metrics.contentPaddingBottom,
      metrics.contentPaddingHorizontal,
    ],
  );

  return (
    <View style={cloudRootStyle}>
      <CloudBubbleGraphic
        width={metrics.cloudWidth}
        height={metrics.cloudHeight}
        viewBoxWidth={CLOUD_VIEWBOX_WIDTH}
        viewBoxHeight={metrics.viewBoxHeight}
        bodyHeightViewBox={metrics.bodyHeightViewBox}
        bodyBottomViewBox={metrics.bodyBottomViewBox}
      />

      <View style={cloudMenuContentStyle} pointerEvents="box-none">
        {options.map((opt, index) => (
          <Fragment key={opt.key}>
            {index > 0 ? <View style={styles.optionDivider} /> : null}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => onSelect(opt.onPress)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionRowText}>{opt.label}</Text>
            </TouchableOpacity>
          </Fragment>
        ))}
      </View>
    </View>
  );
}
