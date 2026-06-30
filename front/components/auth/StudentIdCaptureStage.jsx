import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { createStudentIdCameraLayerStyles } from '../../styles/studentIdCameraLayers';
import { getStudentIdFrameSize } from '../../utils/studentIdFrameCrop';
import StudentIdCameraGuideOverlay from '../../view/src/signup/StudentIdCameraGuideOverlay';

export function useStudentIdCapture(cameraRef) {
  const [frozenUri, setFrozenUri] = useState(null);
  const previewLayoutRef = useRef({ width: 0, height: 0 });
  const lastPhotoRef = useRef(null);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return null;
    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.85,
      skipProcessing: false,
    });
    if (!photo?.base64) return null;
    const uri = photo.uri || `data:image/jpeg;base64,${photo.base64}`;
    lastPhotoRef.current = photo;
    setFrozenUri(uri);
    return photo;
  }, [cameraRef]);

  const resetCapture = useCallback(() => {
    setFrozenUri(null);
    lastPhotoRef.current = null;
  }, []);

  return { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef };
}

export default function StudentIdCaptureStage({
  cameraRef,
  frozenUri,
  statusText,
  guideTextStyle,
  stageStyle,
  previewLayoutRef,
  onStageLayout,
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const layerStyles = useMemo(() => createStudentIdCameraLayerStyles(), []);

  const stageWidth = stageSize.width > 0 ? stageSize.width : screenWidth;
  const stageHeight =
    stageSize.height > 0 ? stageSize.height : Math.max(280, screenHeight * 0.42);
  const { frameWidth, frameHeight } = useMemo(
    () => getStudentIdFrameSize(stageWidth),
    [stageWidth],
  );

  const handleLayout = useCallback(
    (e) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setStageSize({ width, height });
        if (previewLayoutRef) previewLayoutRef.current = { width, height };
        onStageLayout?.({ width, height });
      }
    },
    [onStageLayout, previewLayoutRef],
  );

  return (
    <View style={[styles.stage, stageStyle]} onLayout={handleLayout}>
      {frozenUri ? (
        <Image source={{ uri: frozenUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
      )}
      <StudentIdCameraGuideOverlay
        stageWidth={stageWidth}
        stageHeight={stageHeight}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        statusText={statusText}
        guideTextStyle={guideTextStyle}
        overlayRootStyle={layerStyles.guideOverlay}
        layerStyles={layerStyles}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
