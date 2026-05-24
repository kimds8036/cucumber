import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const SchoolAdPlaceholder = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );

  return (
    <View style={styles.container}>
      <Text>광고</Text>
    </View>
  );
};

export default SchoolAdPlaceholder;
