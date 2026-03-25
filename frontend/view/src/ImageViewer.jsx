import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, TouchableOpacity, Text, Animated } from 'react-native';
import { Image } from 'expo-image';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function ImageViewer({ visible, uri, onClose }) {
  const scale = useRef(new Animated.Value(1)).current;
  const scaleRef = useRef(1);
  const initialDistanceRef = useRef(null);
  const initialScaleRef = useRef(1);

  const reset = () => {
    initialDistanceRef.current = null;
    initialScaleRef.current = 1;
    scaleRef.current = 1;
    scale.setValue(1);
  };

  useEffect(() => {
    if (visible) reset();
  }, [visible]);

  const getDistance = (t1, t2) => {
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches || touches.length !== 2) return;
    const [t1, t2] = touches;
    const dist = getDistance(t1, t2);
    if (!dist) return;
    initialDistanceRef.current = dist;
    initialScaleRef.current = scaleRef.current;
  };

  const handleTouchMove = (e) => {
    const touches = e?.nativeEvent?.touches;
    if (!touches || touches.length !== 2) return;
    if (!initialDistanceRef.current) return;
    const [t1, t2] = touches;
    const dist = getDistance(t1, t2);
    if (!dist) return;

    const ratio = dist / initialDistanceRef.current;
    const nextScale = clamp(initialScaleRef.current * ratio, 1, 4);
    scaleRef.current = nextScale;
    scale.setValue(nextScale);
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

        {/* 터치 기반 pinch-zoom (GestureHandler 없이 구현) */}
        <View
          style={{ width: '100%', height: '70%', overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale }] }}>
            <Image
              source={{ uri: viewerUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

