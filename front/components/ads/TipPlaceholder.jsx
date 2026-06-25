import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../styles/colors';
import TIP_MESSAGES from '../../constants/tipMessages';
import { getNormalize } from '../../styles/frame.style';
import { createAdStyles } from '../../styles/ad.style';
import { TipPill } from './PillBadge';

const TipPlaceholder = ({
  variant = 'board',
  styles: externalStyles,
  normalize: externalNormalize,
  cardStyleOverride,
  badgeOnLeft = false,
}) => {
  const { width } = useWindowDimensions();
  const localNormalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(externalNormalize || localNormalize, width),
    [externalNormalize, localNormalize, width],
  );
  const s = externalStyles || adStyles;

  const tipMessage = useMemo(() => {
    const index = Math.floor(Math.random() * TIP_MESSAGES.length);
    return TIP_MESSAGES[index];
  }, []);

  switch (variant) {
    case 'chat':
      return (
        <View style={s.listItem}>
          <View style={s.listItemLeft}>
            <View style={s.listItemBody}>
              <Text style={s.listItemName}>안내</Text>
              <Text style={s.listItemContent} numberOfLines={2}>
                {tipMessage}
              </Text>
            </View>
          </View>
          <View style={s.listItemRight}>
            <TipPill />
          </View>
        </View>
      );

    case 'search':
      return (
        <View style={[s.fullCard, cardStyleOverride]}>
          <View style={s.contentTimeRow}>
            <View style={s.snippetWrap}>
              <Text style={s.fullSnippet}>{tipMessage}</Text>
            </View>
            <TipPill />
          </View>
        </View>
      );

    case 'mailbox':
      return (
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={s.cardMetaRow}>
              <Text style={s.cardTime}>안내</Text>
            </View>
            <TipPill />
          </View>
          <Text style={s.cardPreview} numberOfLines={4}>
            {tipMessage}
          </Text>
        </View>
      );

    case 'notification':
      return (
        <View style={s.notificationItem}>
          <View style={s.iconContainer}>
            <MaterialIcons
              name="lightbulb"
              size={s.notificationIcon.size}
              color={colors.primary}
            />
          </View>
          <View style={s.notificationContent}>
            <View style={s.notificationTitleSlot}>
              <TipPill />
            </View>
            <Text style={s.notificationText} numberOfLines={3}>
              {tipMessage}
            </Text>
          </View>
        </View>
      );

    case 'boardDetail':
      if (badgeOnLeft) {
        return (
          <View style={s.adSection}>
            <View style={s.adSectionRow}>
              <View style={s.adSectionBadge}>
                <TipPill />
              </View>
              <Text style={s.adSectionText} numberOfLines={2}>
                {tipMessage}
              </Text>
            </View>
          </View>
        );
      }
      return (
        <View style={s.adSection}>
          <Text style={s.adSectionText}>{tipMessage}</Text>
        </View>
      );

    case 'board':
    default:
      return (
        <View style={s.postItem}>
          <View style={s.postHeader}>
            <View style={s.postAuthorRow}>
              <Text style={s.postTime}>안내</Text>
            </View>
            <TipPill />
          </View>
          <View style={s.postBodyRow}>
            <View style={s.postBodyColumn}>
              <Text style={[s.postContent, s.postContentCompact]}>
                {tipMessage}
              </Text>
            </View>
          </View>
        </View>
      );
  }
};

export default TipPlaceholder;
