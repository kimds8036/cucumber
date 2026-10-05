import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AD_REQUEST_OPTIONS, getBannerUnitId } from '../../utils/admob';

class AdMobErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailed?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function AdMobBannerView({ unitId, onFailed }) {
  let ads = null;
  try {
    ads = require('react-native-google-mobile-ads');
  } catch {
    ads = null;
  }

  useEffect(() => {
    if (!ads) onFailed?.();
  }, [ads, onFailed]);

  if (!ads) return null;

  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={AD_REQUEST_OPTIONS}
        onAdFailedToLoad={() => onFailed?.()}
      />
    </View>
  );
}

export default function AdMobBanner({ unitId, onFailed }) {
  if (!unitId) return null;
  return (
    <AdMobErrorBoundary onFailed={onFailed}>
      <AdMobBannerView unitId={unitId} onFailed={onFailed} />
    </AdMobErrorBoundary>
  );
}

/** 배너 단위가 있으면 애드몹, 없거나 실패하면 기존 팁. */
export function AdMobOrTip({ children }) {
  const unitId = getBannerUnitId();
  const [useTip, setUseTip] = useState(!unitId);
  if (useTip) return children;
  return <AdMobBanner unitId={unitId} onFailed={() => setUseTip(true)} />;
}
