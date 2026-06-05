import React from 'react';
import { View, Text } from 'react-native';

const MailboxAdPlaceholder = ({ styles, adData }) => {
  const sponsorLabel = adData?.sponsor ?? adData?.author ?? '스폰서';
  const contentText =
    adData?.content ?? adData?.body ?? '여기에 광고가 표시됩니다.';

  return (
  <View style={styles.card}>
    <View style={styles.cardTopRow}>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardFromLabel}>{sponsorLabel}</Text>
        <Text style={styles.cardMetaDot}>•</Text>
        <Text style={styles.cardTime}>광고</Text>
      </View>
    </View>

    <Text style={styles.cardPreview} numberOfLines={2}>
      {contentText}
    </Text>

    <View style={styles.cardFooterRow}>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statText}>AD</Text>
        </View>
      </View>
    </View>
  </View>
  );
};

export default MailboxAdPlaceholder;
