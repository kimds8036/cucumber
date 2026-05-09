import React from 'react';
import { View, Text } from 'react-native';
import { colors, fonts } from '../../../styles/colors';

const AdPlaceholder = ({ styles, normalize }) => (
  <View style={styles.postItem}>
    <View style={styles.postHeader}>
      <View style={styles.postAuthorRow}>
        <Text style={styles.postAuthor}>스폰서</Text>
        <Text style={styles.postDot}>•</Text>
        <Text style={styles.postTime}>광고</Text>
      </View>
    </View>

    <View style={styles.postBodyRow}>
      <View style={styles.postBodyColumn}>
        <Text style={[styles.postContent, styles.postContentCompact]}>
          여기에 광고가 표시됩니다.
        </Text>
        <View style={styles.postFooter}>
          <View style={styles.postStats}>
            <Text
              style={[
                styles.postStatText,
                { fontFamily: fonts.regular, color: colors.textSecondary },
              ]}
            >
              AD
            </Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

export default AdPlaceholder;
