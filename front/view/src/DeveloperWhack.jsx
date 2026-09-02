import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import SubHeader from '../frame/subHeader';
import Skeleton from '../../components/common/Skeleton';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { api } from '../../utils/api';
import { getNormalize } from '../../styles/mypage.style';
import { themedTextInputProps } from '../../styles/mypage.style';

const CATEGORIES = [
  { key: 'bug', label: '버그 제보' },
  { key: 'feature', label: '기능 제안' },
  { key: 'other', label: '불편 사항' },
];

const HONOREE_NAME_MAX = 10;
const CONTENT_MAX = 50;

/** 회초리 화면 공통 — fontSizes 한 단계 업 */
const wFont = {
  badge: fontSizes.md,
  name: fontSizes.md,
  body: fontSizes.xl,
  label: fontSizes.md,
  input: fontSizes.lg,
  section: fontSizes.lg,
  tab: fontSizes.md,
  caption: fontSizes.sm,
  empty: fontSizes.lg,
  thanksTitle: fontSizes.xl,
  thanksBody: fontSizes.lg,
  button: fontSizes.lg,
  counter: fontSizes.md,
  reply: fontSizes.md,
};

function WhackListSkeleton({ normalize, width }) {
  const contentWidth = Math.max(width - normalize(16) * 2 - normalize(48), normalize(160));
  return (
    <>
      {[0, 1, 2, 3, 4].map((key) => (
        <View
          key={key}
          style={{
            paddingHorizontal: normalize(16),
            paddingVertical: normalize(14),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: normalize(8) }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width={normalize(64)} height={normalize(20)} borderRadius={normalize(999)} />
              <Skeleton
                width={contentWidth * (0.72 + (key % 3) * 0.08)}
                height={normalize(18)}
                borderRadius={normalize(6)}
                style={{ marginTop: normalize(10) }}
              />
              <Skeleton
                width={normalize(56)}
                height={normalize(14)}
                borderRadius={normalize(4)}
                style={{ marginTop: normalize(8) }}
              />
            </View>
            <View style={{ width: normalize(48), alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Skeleton width={normalize(36)} height={normalize(20)} borderRadius={normalize(999)} />
              <Skeleton width={normalize(16)} height={normalize(16)} borderRadius={normalize(4)} />
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

function categoryMeta(category) {
  if (category === 'bug') {
    return {
      label: '버그',
      color: colors.alertDark,
      backgroundColor: colors.alertLight,
      borderColor: colors.alert,
    };
  }
  if (category === 'feature') {
    return {
      label: '기능',
      color: colors.primaryDark,
      backgroundColor: colors.primaryLight10,
      borderColor: colors.primary,
    };
  }
  return {
    label: '불편',
    color: colors.scrapDark,
    backgroundColor: colors.yellow,
    borderColor: colors.scrap,
  };
}

function adminStatusMeta(status) {
  if (status === 'fixed') {
    return { label: '반영 완료', color: colors.primary, backgroundColor: colors.primaryLight10 };
  }
  if (status === 'planned') {
    return { label: '도입 예정', color: colors.textSecondary, backgroundColor: 'rgba(39, 42, 38, 0.06)' };
  }
  if (status === 'declined') {
    return { label: '도입 불가', color: colors.textSecondary, backgroundColor: 'rgba(39, 42, 38, 0.06)' };
  }
  return null;
}

const DeveloperWhack = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [composeVisible, setComposeVisible] = useState(false);
  const [category, setCategory] = useState('bug');
  const [honoreeName, setHonoreeName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [thanksVisible, setThanksVisible] = useState(false);

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || '';
  const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();

  const trimmedName = honoreeName.trim();
  const trimmedContent = content.trim();
  const canSubmit =
    !submitting
    && trimmedName.length >= 1
    && trimmedName.length <= HONOREE_NAME_MAX
    && trimmedContent.length >= 1
    && trimmedContent.length <= CONTENT_MAX;

  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/developer-feedback', {
        params: { page: 1, limit: 80 },
      });
      // 관리자 액션(반영 완료·도입 예정·도입 불가)만 공개 목록에 표시
      const ACTIONED = new Set(['fixed', 'planned', 'declined']);
      const raw = res.data?.data?.items || [];
      setItems(raw.filter((it) => ACTIONED.has(it.adminResponseStatus)));
    } catch (e) {
      console.warn('[DeveloperWhack] list load failed', e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resetComposeForm = () => {
    setCategory('bug');
    setHonoreeName('');
    setContent('');
  };

  const openCompose = () => {
    resetComposeForm();
    setComposeVisible(true);
  };

  const closeCompose = () => {
    if (submitting) return;
    setComposeVisible(false);
  };

  const handleHonoreeNameChange = (text) => {
    setHonoreeName(text.slice(0, HONOREE_NAME_MAX));
  };

  const handleContentChange = (text) => {
    setContent(text.slice(0, CONTENT_MAX));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post('/api/developer-feedback', {
        category,
        honoreeName: trimmedName,
        schoolPublic: false,
        content: trimmedContent,
        appVersion: appVersion || undefined,
        deviceInfo: deviceInfo || undefined,
      });
      setComposeVisible(false);
      resetComposeForm();
      setThanksVisible(true);
      await load({ silent: true });
    } catch (e) {
      console.warn('[DeveloperWhack] submit failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const fieldLabelStyle = {
    marginTop: normalize(16),
    marginBottom: normalize(6),
    fontFamily: fonts.bold,
    fontSize: normalize(wFont.label),
    color: colors.textPrimary,
  };

  const counterStyle = {
    marginTop: normalize(4),
    fontFamily: fonts.regular,
    fontSize: normalize(wFont.counter),
    color: colors.textSecondary,
    textAlign: 'right',
  };

  const inputStyle = {
    padding: normalize(12),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: normalize(wFont.input),
    color: colors.textPrimary,
  };

  const renderItem = ({ item }) => {
    const expanded = expandedId === item.id;
    const cat = categoryMeta(item.category);
    const status = adminStatusMeta(item.adminResponseStatus);
    const replyText = String(item.adminResponse || '').trim();

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => toggleExpand(item.id)}
        style={{
          paddingHorizontal: normalize(16),
          paddingVertical: normalize(14),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: normalize(8) }}>
            {item.reporterCount > 1 ? (
              <View style={{ marginBottom: normalize(6) }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: normalize(7),
                    paddingVertical: normalize(2),
                    borderRadius: normalize(999),
                    backgroundColor: 'rgba(39, 42, 38, 0.06)',
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: normalize(wFont.badge), color: colors.textSecondary }}>
                    {item.reporterCount}명 제보
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: normalize(8) }}>
              <View style={{ flexShrink: 0, alignItems: 'flex-start' }}>
                {status ? (
                  <View
                    style={{
                      marginTop: normalize(3),
                      paddingHorizontal: normalize(7),
                      paddingVertical: normalize(2),
                      borderRadius: normalize(999),
                      backgroundColor: status.backgroundColor,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bold, fontSize: normalize(wFont.badge), color: status.color }}>
                      {status.label}
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={{
                    marginTop: normalize(6),
                    fontFamily: fonts.regular,
                    fontSize: normalize(wFont.name),
                    color: colors.textSecondary,
                  }}
                >
                  {item.honoreeDisplay || '익명'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: normalize(wFont.body),
                    color: colors.textPrimary,
                    lineHeight: normalize(24),
                  }}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={{
              width: normalize(48),
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              paddingLeft: normalize(4),
            }}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View
                style={{
                  paddingHorizontal: normalize(7),
                  paddingVertical: normalize(2),
                  borderRadius: normalize(999),
                  backgroundColor: cat.backgroundColor,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: normalize(wFont.badge), color: cat.color }}>
                  {cat.label}
                </Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={normalize(18)}
              color={colors.textSecondary}
            />
          </View>
        </View>

        {expanded ? (
          <View
            style={{
              marginTop: normalize(10),
              paddingTop: normalize(12),
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(wFont.caption),
                color: colors.textSecondary,
                marginBottom: normalize(6),
              }}
            >
              개발팀 답변
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(wFont.reply),
                color: colors.textPrimary,
                lineHeight: normalize(22),
              }}
            >
              {replyText || '답변이 등록되었어요.'}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const composeForm = (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(32),
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          marginTop: normalize(8),
          marginBottom: normalize(8),
          fontFamily: fonts.bold,
          fontSize: normalize(wFont.section),
          color: colors.textPrimary,
        }}
      >
        무엇을 전달할까요?
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: normalize(8) }}>
        {CATEGORIES.map((item) => {
          const active = category === item.key;
          const meta = categoryMeta(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setCategory(item.key)}
              style={{
                paddingHorizontal: normalize(12),
                paddingVertical: normalize(8),
                borderRadius: normalize(20),
                borderWidth: 1,
                borderColor: active ? meta.borderColor : colors.border,
                backgroundColor: active ? meta.backgroundColor : colors.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: active ? fonts.bold : fonts.regular,
                  fontSize: normalize(wFont.tab),
                  color: active ? meta.color : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={fieldLabelStyle}>이름</Text>
      <TextInput
        style={inputStyle}
        placeholder="예: 김○○ (최대 10자)"
        value={honoreeName}
        onChangeText={handleHonoreeNameChange}
        maxLength={HONOREE_NAME_MAX}
        {...themedTextInputProps}
      />
      <Text style={counterStyle}>
        {honoreeName.length}/{HONOREE_NAME_MAX}
      </Text>

      <Text style={fieldLabelStyle}>내용</Text>
      <TextInput
        style={{
          ...inputStyle,
          height: normalize(120),
          textAlignVertical: 'top',
        }}
        multiline
        scrollEnabled
        placeholder="불편했던 점이나 바라는 기능을 짧게 적어 주세요."
        value={content}
        onChangeText={handleContentChange}
        maxLength={CONTENT_MAX}
        {...themedTextInputProps}
      />
      <Text style={counterStyle}>
        {content.length}/{CONTENT_MAX}
      </Text>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={{
          marginTop: normalize(16),
          paddingVertical: normalize(14),
          borderRadius: normalize(10),
          backgroundColor: canSubmit ? colors.primary : colors.textLight20,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: normalize(wFont.button),
            color: colors.textWhite,
          }}
        >
          {submitting ? '보내는 중…' : '개발팀에 전달하기'}
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <SubHeader
        title="회초리"
        onBack={() => navigation.goBack()}
        rightButtonText="제보하기"
        onRightPress={openCompose}
      />

      {loading ? (
        <WhackListSkeleton normalize={normalize} width={width} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load({ silent: true });
              }}
              tintColor={colors.primary}
            />
          )}
          ListEmptyComponent={(
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: normalize(24),
                paddingTop: normalize(80),
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: normalize(wFont.empty),
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: normalize(24),
                }}
              >
                아직 공개된 제보가 없어요.{'\n'}우측 상단에서 의견을 남길 수 있어요.
              </Text>
            </View>
          )}
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}

      <Modal visible={composeVisible} animationType="slide" onRequestClose={closeCompose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <SubHeader
            title="제보하기"
            onBack={closeCompose}
            rightButtonText="전달"
            onRightPress={handleSubmit}
            rightDisabled={!canSubmit}
          />
          {composeForm}
        </SafeAreaView>
      </Modal>

      <Modal visible={thanksVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            paddingHorizontal: normalize(24),
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: normalize(12),
              padding: normalize(20),
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: normalize(wFont.thanksTitle),
                color: colors.textPrimary,
                marginBottom: normalize(8),
              }}
            >
              감사합니다
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(wFont.thanksBody),
                color: colors.textSecondary,
                lineHeight: normalize(24),
              }}
            >
              소중한 피드백 감사합니다.{'\n'}
              검토 후 이 목록에 반영될 수 있어요.
            </Text>
            <TouchableOpacity
              onPress={() => setThanksVisible(false)}
              style={{
                marginTop: normalize(16),
                paddingVertical: normalize(12),
                borderRadius: normalize(8),
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  color: colors.textWhite,
                  fontSize: normalize(wFont.button),
                }}
              >
                확인
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DeveloperWhack;
