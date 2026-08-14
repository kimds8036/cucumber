import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { BADGE_BY_KEY } from '../../constants/badges';

const BadgeManage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [badges, setBadges] = useState([]);
  const [equippedKey, setEquippedKey] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/badges/me');
      const data = res.data?.data;
      setBadges(Array.isArray(data?.badges) ? data.badges : []);
      setEquippedKey(data?.equippedBadgeKey || null);
    } catch (e) {
      Alert.alert(
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

  const handlePress = async (item) => {
    if (!item?.owned) {
      Alert.alert(item.title, item.description || '아직 잠겨 있어요.');
      return;
    }
    const nextKey = item.equipped ? null : item.key;
    setSaving(true);
    try {
      const res = await api.put('/api/badges/equip', { badgeKey: nextKey });
      setEquippedKey(res.data?.data?.equippedBadgeKey || null);
      setBadges((prev) =>
        prev.map((b) => ({
          ...b,
          equipped: b.key === (res.data?.data?.equippedBadgeKey || null),
        })),
      );
    } catch (e) {
      Alert.alert(
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
        <View style={{ paddingHorizontal: normalize(20), paddingTop: normalize(16) }}>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: normalize(12) }}>
            {badges.map((item) => {
              const locked = !item.owned;
              const catalog = BADGE_BY_KEY[item.key] || item;
              const progress = item.progress;
              const progressLabel =
                progress && Number(progress.target) > 0
                  ? `${Math.min(Number(progress.current) || 0, Number(progress.target))}/${progress.target}`
                  : '';
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handlePress(item)}
                  disabled={saving}
                  activeOpacity={0.75}
                  style={{
                    width: '47%',
                    flexGrow: 1,
                    backgroundColor: '#fff',
                    borderRadius: normalize(14),
                    padding: normalize(14),
                    borderWidth: item.equipped ? 2 : 1,
                    borderColor: item.equipped ? catalog.color : '#E4EBE3',
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(8) }}>
                    <Ionicons
                      name={locked ? catalog.iconOutline || 'lock-closed-outline' : catalog.icon}
                      size={normalize(26)}
                      color={locked ? colors.textSecondary : catalog.color}
                    />
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
                  {item.equipped ? (
                    <Text
                      style={{
                        marginTop: normalize(6),
                        fontSize: normalize(12),
                        fontWeight: '700',
                        color: catalog.color,
                      }}
                    >
                      장착 중
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default BadgeManage;
