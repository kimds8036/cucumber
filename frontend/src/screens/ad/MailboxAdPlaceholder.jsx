import React from 'react';
import { View, Text } from 'react-native';

const MailboxAdPlaceholder = ({ styles }) => (
  <View style={styles.card}>
    <View style={styles.cardTopRow}>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardFromLabel}>스폰서</Text>
        <Text style={styles.cardMetaDot}>•</Text>
        <Text style={styles.cardTime}>광고</Text>
      </View>
    </View>

    <Text style={styles.cardPreview} numberOfLines={2}>
      여기에 광고가 표시됩니다.
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

export default MailboxAdPlaceholder;
