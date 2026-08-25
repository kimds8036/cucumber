import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { appAlert } from '../../utils/appAlert';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { BADGE_BY_KEY } from '../../constants/badges';

function BadgeTile({ item, cardWidth, gap, normalize, saving, onPressOwned }) {
  const locked = !item.owned;
  const catalog = BADGE_BY_KEY[item.key] || item;
  const progress = item.progress;
  const progressLabel =
    progress && Number(progress.target) > 0
      ? `${Math.min(Number(progress.current) || 0, Number(progress.target))}/${progress.target}`
      : '';
  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    if (locked) {
      shake();
      return;
    }
    if (saving) return;
    onPressOwned(item);
  };

  return (
    <Animated.View
      style={{
        width: cardWidth,
        marginBottom: gap,
        transform: [{ translateX: shakeX }],
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={locked ? 1 : 0.85}
        style={{
          backgroundColor: '#fff',
          borderRadius: normalize(14),
          padding: normalize(14),
          borderWidth: 2,
          borderColor: item.equipped ? catalog.color : '#E4EBE3',
          opacity: locked ? 0.55 : 1,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: normalize(10),
            right: normalize(10),
            opacity: item.equipped ? 1 : 0,
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={normalize(20)}
            color={catalog.color}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(8) }}>
          {catalog.image ? (
            <Image
              source={catalog.image}
              style={{
                width: normalize(26),
                height: normalize(26),
                opacity: locked ? 0.55 : 1,
              }}
              resizeMode="contain"
            />
          ) : (
            <Ionicons
              name={locked ? catalog.iconOutline || 'lock-closed-outline' : catalog.icon}
              size={normalize(26)}
              color={locked ? colors.textSecondary : catalog.color}
            />
          )}
          {locked ? (
            <Ionicons
              name="lock-closed"
              size={normalize(14)}
              color={colors.textSecondary}
            />
          ) : null}
        </View>
        <Text
          style={{
            marginTop: normalize(10),
            fontWeight: '700',
            fontSize: normalize(15),
            color: colors.textPrimary,
            paddingRight: normalize(22),
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            marginTop: normalize(4),
            fontSize: normalize(12),
            color: colors.textSecondary,
            lineHeight: normalize(17),
          }}
        >
          {item.description}
        </Text>
        {progressLabel ? (
          <Text
            style={{
              marginTop: normalize(8),
              fontSize: normalize(12),
              fontWeight: '600',
              color: catalog.color,
            }}
          >
            {progressLabel}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const BadgeManage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [badges, setBadges] = useState([]);

  const pad = normalize(20);
  const gap = normalize(12);
  const cardWidth = Math.floor((width - pad * 2 - gap) / 2);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/badges/me');
      const data = res.data?.data;
      setBadges(Array.isArray(data?.badges) ? data.badges : []);
    } catch (e) {
      appAlert.alert(
        '오류',
        e.response?.data?.message || '배지를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePressOwned = async (item) => {
    const nextKey = item.equipped ? null : item.key;
    setSaving(true);
    try {
      const res = await api.put('/api/badges/equip', { badgeKey: nextKey });
      const equippedKey = res.data?.data?.equippedBadgeKey || null;
      setBadges((prev) =>
        prev.map((b) => ({
          ...b,
          equipped: b.key === equippedKey,
        })),
      );
    } catch (e) {
      appAlert.alert(
        '오류',
        e.response?.data?.message || '배지 장착에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <SubHeader title="배지" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: normalize(40) }} color={colors.primary} />
      ) : (
        <View style={{ paddingHorizontal: pad, paddingTop: normalize(16) }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: normalize(13),
              marginBottom: normalize(16),
              lineHeight: normalize(20),
            }}
          >
            잠금 해제한 배지 중 하나를 대표로 달 수 있어요. 다시 누르면 해제됩니다.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              columnGap: gap,
            }}
          >
            {badges.map((item) => (
              <BadgeTile
                key={item.key}
                item={item}
                cardWidth={cardWidth}
                gap={gap}
                normalize={normalize}
                saving={saving}
                onPressOwned={handlePressOwned}
              />
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default BadgeManage;
