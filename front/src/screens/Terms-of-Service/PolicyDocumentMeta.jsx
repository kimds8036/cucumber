import React from 'react';
import { Text, View } from 'react-native';
import { formatLegalDateYmd } from '../../../utils/legalDocumentDisplay';

/** DB title·version·updated_at 기반 제정일/시행일/버전 표시 */
const PolicyDocumentMeta = ({ meta, styles }) => {
  if (!meta) return null;

  const enacted = formatLegalDateYmd(meta.enactedAt);
  const effective = formatLegalDateYmd(meta.effectiveAt);
  const version = meta.version ? String(meta.version).trim() : '';

  if (!enacted && !effective && !version) return null;

  return (
    <View style={styles.legalMetaBlock}>
      {enacted ? (
        <Text style={styles.legalMetaLine}>
          <Text style={styles.legalMetaLabel}>제정일</Text>
          {`: [${enacted}]`}
        </Text>
      ) : null}
      {effective ? (
        <Text style={styles.legalMetaLine}>
          <Text style={styles.legalMetaLabel}>시행일</Text>
          {`: [${effective}]`}
        </Text>
      ) : null}
      {version ? (
        <Text style={styles.legalMetaLine}>
          <Text style={styles.legalMetaLabel}>버전</Text>
          {`: ${version}`}
        </Text>
      ) : null}
      <View style={styles.divider} />
    </View>
  );
};

export default PolicyDocumentMeta;
