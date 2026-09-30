import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../styles/colors';
import {
  clampPan,
  cropRegionFromTransform,
  getCoverBaseSize,
} from '../../utils/profilePhotoCrop';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const getDistance = (t1, t2) => {
  const dx = t1.pageX - t2.pageX;
  const dy = t1.pageY - t2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

export default function ProfilePhotoCropModal({
  visible,
  uri,
  imageWidth,
  imageHeight,
  onCancel,
  onConfirm,
  confirming = false,
}) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const frameSize = Math.round(Math.min(Math.max(screenW, 1) * 0.72, 300));
  const frameRadius = Math.round(frameSize * (28 / 70));
  const [naturalSize, setNaturalSize] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  const resolvedW = naturalSize?.w || imageWidth;
  const resolvedH = naturalSize?.h || imageHeight;
  const { baseW, baseH } = useMemo(
    () => getCoverBaseSize(resolvedW, resolvedH, frameSize),
    [resolvedW, resolvedH, frameSize],
  );

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const pinchStartDist = useRef(null);
  const pinchStartScale = useRef(1);
  const panActive = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const applyTransform = (nextScale, nextTx, nextTy) => {
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const pan = clampPan(nextTx, nextTy, s, baseW, baseH, frameSize);
    scaleRef.current = s;
    txRef.current = pan.x;
    tyRef.current = pan.y;
    scale.setValue(s);
    translateX.setValue(pan.x);
    translateY.setValue(pan.y);
  };

  useEffect(() => {
    if (!visible) return;
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    setReady(false);
    setNaturalSize(null);
  }, [visible, uri, scale, translateX, translateY]);

  useEffect(() => {
    if (!visible || !uri) return undefined;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (cancelled || !(w > 1) || !(h > 1)) return;
        setNaturalSize({ w, h });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [visible, uri]);

  const handleTouchStart = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches?.length) return;
    if (touches.length >= 2) {
      panActive.current = false;
      const dist = getDistance(touches[0], touches[1]);
      if (!dist) return;
      pinchStartDist.current = dist;
      pinchStartScale.current = scaleRef.current;
      return;
    }
    panActive.current = true;
    panStart.current = {
      x: touches[0].pageX,
      y: touches[0].pageY,
      tx: txRef.current,
      ty: tyRef.current,
    };
  };

  const handleTouchMove = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches?.length) return;
    if (touches.length >= 2) {
      panActive.current = false;
      const dist = getDistance(touches[0], touches[1]);
      if (!dist) return;
      if (!pinchStartDist.current) {
        pinchStartDist.current = dist;
        pinchStartScale.current = scaleRef.current;
      }
      const nextScale = pinchStartScale.current * (dist / pinchStartDist.current);
      applyTransform(nextScale, txRef.current, tyRef.current);
      return;
    }
    if (!panActive.current) {
      panActive.current = true;
      panStart.current = {
        x: touches[0].pageX,
        y: touches[0].pageY,
        tx: txRef.current,
        ty: tyRef.current,
      };
    }
    const dx = touches[0].pageX - panStart.current.x;
    const dy = touches[0].pageY - panStart.current.y;
    applyTransform(
      scaleRef.current,
      panStart.current.tx + dx,
      panStart.current.ty + dy,
    );
  };

  const handleTouchEnd = () => {
    pinchStartDist.current = null;
    panActive.current = false;
    applyTransform(scaleRef.current, txRef.current, tyRef.current);
  };

  const handleConfirm = () => {
    if (confirming) return;
    const cropRegion = cropRegionFromTransform({
      scale: scaleRef.current,
      tx: txRef.current,
      ty: tyRef.current,
      baseW,
      baseH,
      frameSize,
    });
    onConfirm?.(cropRegion);
  };

  const stageReady = stageSize.width > 0 && stageSize.height > 0;
  const imageLeft = stageReady ? (stageSize.width - baseW) / 2 : 0;
  const imageTop = stageReady ? (stageSize.height - baseH) / 2 : 0;
  const frameLeft = stageReady ? (stageSize.width - frameSize) / 2 : 0;
  const frameTop = stageReady ? (stageSize.height - frameSize) / 2 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>사진 위치 조정</Text>
        <Text style={styles.hint}>드래그로 옮기고, 두 손가락으로 확대하세요</Text>
        <View
          style={styles.stage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (!(width > 0) || !(height > 0)) return;
            setStageSize((prev) =>
              prev.width === width && prev.height === height
                ? prev
                : { width, height },
            );
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {uri && stageReady ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: imageLeft,
                top: imageTop,
                width: baseW,
                height: baseH,
                zIndex: 0,
                transform: [{ translateX }, { translateY }, { scale }],
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: baseW, height: baseH }}
                resizeMode="cover"
                onLoad={() => setReady(true)}
                onLoadEnd={() => setReady(true)}
              />
            </Animated.View>
          ) : null}
          {stageReady ? (
            <View pointerEvents="none" style={styles.overlay} collapsable={false}>
              <View style={[styles.dim, { height: Math.max(0, frameTop) }]} />
              <View style={[styles.overlayMid, { height: frameSize }]}>
                <View style={[styles.dim, { width: Math.max(0, frameLeft) }]} />
                <View
                  style={[
                    styles.guideFrame,
                    {
                      width: frameSize,
                      height: frameSize,
                      borderRadius: frameRadius,
                    },
                  ]}
                >
                  <View style={[styles.gridLineH, { top: '33.333%' }]} />
                  <View style={[styles.gridLineH, { top: '66.666%' }]} />
                  <View style={[styles.gridLineV, { left: '33.333%' }]} />
                  <View style={[styles.gridLineV, { left: '66.666%' }]} />
                </View>
                <View style={styles.dimFlex} />
              </View>
              <View style={styles.dimFlex} />
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={onCancel}
            disabled={confirming}
          >
            <Text style={styles.btnGhostText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnMain, confirming && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={confirming || !ready}
          >
            <Text style={styles.btnMainText}>
              {confirming ? '저장 중...' : '완료'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  title: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 12,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    elevation: 4,
  },
  overlayMid: {
    flexDirection: 'row',
  },
  dim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dimFlex: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  guideFrame: {
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  btnGhostText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  btnMain: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  btnMainText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
