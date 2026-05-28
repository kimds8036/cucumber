import React, { useEffect } from 'react';

export default function UserGuideScreen({ navigation }) {
  useEffect(() => {
    navigation.replace('GuideOverlay', { mode: 'guide' });
  }, [navigation]);

  return null;
}
