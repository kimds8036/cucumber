import React, { useEffect } from 'react';

export default function OnboardingScreen({ navigation }) {
  useEffect(() => {
    navigation.replace('GuideOverlay', { mode: 'onboarding' });
  }, [navigation]);

  return null;
}
