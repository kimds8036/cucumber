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
  const frameSize = Math.round(Math.min(screenW * 0.72, 300));
  const frameRadius = Math.round(frameSize * (28 / 70));
  const { baseW, baseH } = useMemo(
    () => getCoverBaseSize(imageWidth, imageHeight, frameSize),
    [imageWidth, imageHeight, frameSize],
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
  const [ready, setReady] = useState(false);

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
  }, [visible, uri, scale, translateX, translateY]);

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>사진 위치 조정</Text>
        <Text style={styles.hint}>드래그로 옮기고, 두 손가락으로 확대하세요</Text>
        <View
          style={styles.stage}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              width: baseW,
              height: baseH,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: baseW, height: baseH }}
                resizeMode="cover"
                onLoadEnd={() => setReady(true)}
              />
            ) : null}
          </Animated.View>
          <View pointerEvents="none" style={styles.mask}>
            <View style={styles.maskFlex} />
            <View style={[styles.maskMid, { height: frameSize }]}>
              <View style={styles.maskFlex} />
              <View
                style={{
                  width: frameSize,
                  height: frameSize,
                  borderRadius: frameRadius,
                  borderWidth: 2,
                  borderColor: colors.textWhite,
                }}
              />
              <View style={styles.maskFlex} />
            </View>
            <View style={styles.maskFlex} />
          </View>
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
    color: colors.textWhite,
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
  },
  maskFlex: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskMid: {
    flexDirection: 'row',
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
    color: colors.textWhite,
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
    color: colors.textWhite,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
