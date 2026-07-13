import React from 'react';
import { View, Text } from 'react-native';
import TipPlaceholder from '../../../components/ads/TipPlaceholder';
import { AdPill } from '../../../components/ads/PillBadge';

const MailboxAdPlaceholder = ({ styles, adData }) => {
  if (adData == null) {
    return <TipPlaceholder variant="mailbox" styles={styles} />;
  }

  const sponsorLabel =
    adData?.title || adData?.sponsor || adData?.author || '스폰서';
  const contentText =
    adData?.body || adData?.content || '여기에 광고가 표시됩니다.';

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardFromLabel}>{sponsorLabel}</Text>
          <Text style={styles.cardMetaDot}>•</Text>
          <Text style={styles.cardTime}>광고</Text>
        </View>
        <AdPill />
      </View>

      <Text style={styles.cardPreview} numberOfLines={2}>
        {contentText}
      </Text>
    </View>
  );
};

export default MailboxAdPlaceholder;
