import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import Skeleton from '../../components/common/Skeleton';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const getDistance = (t1, t2) => {
  const dx = t1.pageX - t2.pageX;
  const dy = t1.pageY - t2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

export default function ImageViewer({ visible, uri, onClose }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleRef = useRef(1);
  const initialDistanceRef = useRef(null);
  const initialScaleRef = useRef(1);
  const lastTranslateXRef = useRef(0);
  const lastTranslateYRef = useRef(0);
  const panActiveRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, baseTx: 0, baseTy: 0 });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageReady, setImageReady] = useState(false);

  const reset = () => {
    scaleRef.current = 1;
    initialDistanceRef.current = null;
    initialScaleRef.current = 1;
    lastTranslateXRef.current = 0;
    lastTranslateYRef.current = 0;
    panActiveRef.current = false;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  };

  useEffect(() => {
    if (visible) {
      reset();
      setImageReady(false);
    }
  }, [visible]);

  const getMaxTranslate = (currentScale) => {
    const { width, height } = containerSize;
    if (!width || !height || currentScale <= 1) {
      return { maxX: 0, maxY: 0 };
    }
    const maxX = Math.max(0, (width * (currentScale - 1)) / 2);
    const maxY = Math.max(0, (height * (currentScale - 1)) / 2);
    return { maxX, maxY };
  };

  const clampTranslation = (x, y, currentScale) => {
    const { maxX, maxY } = getMaxTranslate(currentScale);
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  const applyTranslation = (x, y, currentScale) => {
    const { x: cx, y: cy } = clampTranslation(x, y, currentScale);
    lastTranslateXRef.current = cx;
    lastTranslateYRef.current = cy;
    translateX.setValue(cx);
    translateY.setValue(cy);
  };

  const applyScale = (nextScale) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    scaleRef.current = clamped;
    scale.setValue(clamped);

    if (clamped <= 1) {
      lastTranslateXRef.current = 0;
      lastTranslateYRef.current = 0;
      translateX.setValue(0);
      translateY.setValue(0);
      return;
    }

    applyTranslation(lastTranslateXRef.current, lastTranslateYRef.current, clamped);
  };

  const handleTouchStart = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches?.length) return;

    if (touches.length >= 2) {
      panActiveRef.current = false;
      const dist = getDistance(touches[0], touches[1]);
      if (!dist) return;
      initialDistanceRef.current = dist;
      initialScaleRef.current = scaleRef.current;
      return;
    }

    if (touches.length === 1 && scaleRef.current > 1) {
      panActiveRef.current = true;
      panStartRef.current = {
        x: touches[0].pageX,
        y: touches[0].pageY,
        baseTx: lastTranslateXRef.current,
        baseTy: lastTranslateYRef.current,
      };
    }
  };

  const handleTouchMove = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches?.length) return;

    if (touches.length >= 2) {
      panActiveRef.current = false;
      const dist = getDistance(touches[0], touches[1]);
      if (!dist) return;

      if (!initialDistanceRef.current) {
        initialDistanceRef.current = dist;
        initialScaleRef.current = scaleRef.current;
      }

      const ratio = dist / initialDistanceRef.current;
      const nextScale = clamp(initialScaleRef.current * ratio, MIN_SCALE, MAX_SCALE);
      scaleRef.current = nextScale;
      scale.setValue(nextScale);

      if (nextScale <= 1) {
        lastTranslateXRef.current = 0;
        lastTranslateYRef.current = 0;
        translateX.setValue(0);
        translateY.setValue(0);
      } else {
        applyTranslation(lastTranslateXRef.current, lastTranslateYRef.current, nextScale);
      }
      return;
    }

    if (touches.length === 1 && scaleRef.current > 1) {
      if (!panActiveRef.current) {
        panActiveRef.current = true;
        panStartRef.current = {
          x: touches[0].pageX,
          y: touches[0].pageY,
          baseTx: lastTranslateXRef.current,
          baseTy: lastTranslateYRef.current,
        };
      }

      const dx = touches[0].pageX - panStartRef.current.x;
      const dy = touches[0].pageY - panStartRef.current.y;
      applyTranslation(
        panStartRef.current.baseTx + dx,
        panStartRef.current.baseTy + dy,
        scaleRef.current,
      );
    }
  };

  const handleTouchEnd = () => {
    initialDistanceRef.current = null;
    panActiveRef.current = false;
    applyScale(scaleRef.current);
  };

  const hasImage = Boolean(uri);
  const viewerUri = useMemo(() => uri, [uri]);

  return (
    <Modal visible={visible && hasImage} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            reset();
            onClose?.();
          }}
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
        </TouchableOpacity>

        <View
          style={{ width: '100%', height: '70%', overflow: 'hidden' }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerSize({ width, height });
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          >
            {!imageReady ? (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Skeleton width="86%" height="86%" borderRadius={16} />
              </View>
            ) : null}
            <Image
              source={{ uri: viewerUri }}
              style={{
                width: '100%',
                height: '100%',
                opacity: imageReady ? 1 : 0,
              }}
              contentFit="contain"
              onLoadEnd={() => setImageReady(true)}
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
