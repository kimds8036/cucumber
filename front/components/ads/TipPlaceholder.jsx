import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, fontSizes } from '../../styles/colors';
import TIP_MESSAGES from '../../constants/tipMessages';
import { getNormalize } from '../../styles/frame.style';
import { createAdStyles } from '../../styles/ad.style';
import { TipPill } from './PillBadge';
import { pickTipBody } from '../../utils/tipsApi';

const TipPlaceholder = ({
  variant = 'board',
  styles: externalStyles,
  normalize: externalNormalize,
  cardStyleOverride,
  badgeOnLeft = false,
  /** 값이 바뀌면 Tip 문구를 다시 랜덤 선택 (고정 팁이면 유지) */
  refreshKey = 0,
  /** 부모가 문구를 직접 넘기면 서버 fetch 생략 */
  message: messageProp,
}) => {
  const { width } = useWindowDimensions();
  const localNormalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(externalNormalize || localNormalize, width),
    [externalNormalize, localNormalize, width],
  );
  const s = externalStyles || adStyles;
  const n = externalNormalize || localNormalize;
  const lastTipRef = useRef(null);
  const [tipMessage, setTipMessage] = useState(
    () => messageProp || TIP_MESSAGES[0] || '',
  );

  useEffect(() => {
    if (messageProp != null && messageProp !== '') {
      setTipMessage(messageProp);
      lastTipRef.current = messageProp;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const next = await pickTipBody({
        refreshKey,
        lastBody: lastTipRef.current,
      });
      if (!cancelled && next) {
        lastTipRef.current = next;
        setTipMessage(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, messageProp]);

  switch (variant) {
    case 'topBanner':
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

    case 'alert':
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

    case 'chat':
      return (
        <View style={s.listItem}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: n(14),
              flex: 1,
            }}
          >
            <View
              style={{
                width: n(37),
                height: n(37),
                borderRadius: n(26),
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.primary,
              }}
            >
              <MaterialCommunityIcons
                name="bullhorn"
                size={n(22)}
                color={colors.green}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: n(fontSizes.xxl),
                  fontFamily: fonts.bold,
                  color: colors.textPrimary,
                  marginBottom: n(2),
                }}
              >
                tip
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: n(fontSizes.lg),
                  fontFamily: fonts.regular,
                  color: colors.textSecondary,
                }}
              >
                {tipMessage}
              </Text>
            </View>
          </View>
        </View>
      );

    case 'search':
      return (
        <View style={[s.fullCard, cardStyleOverride]}>
          <View style={s.contentTimeRow}>
            <View style={{ marginRight: n(8) }}>
              <TipPill />
            </View>
            <View style={s.snippetWrap}>
              <Text style={s.fullSnippet}>{tipMessage}</Text>
            </View>
          </View>
        </View>
      );

    case 'mailbox':
      return (
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={s.cardMetaRow}>
              <TipPill />
            </View>
          </View>
          <Text
            style={[
              s.cardPreview,
              { flexGrow: 0, lineHeight: n(22) },
            ]}
            numberOfLines={4}
          >
            {tipMessage}
          </Text>
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
              <TipPill />
            </View>
          </View>
          <View style={s.postBodyRow}>
            <View style={s.postBodyColumn}>
              <Text
                style={[
                  s.postContent,
                  s.postContentCompact,
                  { marginTop: n(4) },
                ]}
              >
                {tipMessage}
              </Text>
            </View>
          </View>
        </View>
      );
  }
};

export default TipPlaceholder;
