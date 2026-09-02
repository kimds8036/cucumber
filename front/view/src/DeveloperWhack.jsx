import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
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

function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function categoryMeta(category) {
  if (category === 'bug') {
    return { label: '버그', color: colors.alert, backgroundColor: 'rgba(255, 159, 159, 0.12)' };
  }
  if (category === 'feature') {
    return { label: '기능', color: colors.primary, backgroundColor: colors.primaryLight10 };
  }
  return { label: '기타', color: colors.textSecondary, backgroundColor: 'rgba(39, 42, 38, 0.06)' };
}

function adminStatusMeta(status) {
  if (status === 'fixed') {
    return { label: '반영 완료', color: colors.primary, backgroundColor: colors.primaryLight10 };
  }
  if (status === 'planned') {
    return { label: '도입 예정', color: '#B8860B', backgroundColor: 'rgba(255, 193, 7, 0.12)' };
  }
  if (status === 'declined') {
    return { label: '도입 불가', color: colors.textSecondary, backgroundColor: 'rgba(39, 42, 38, 0.06)' };
  }
  return null;
}

function hasAdminReply(item) {
  const status = item?.adminResponseStatus || 'none';
  const text = String(item?.adminResponse || '').trim();
  return status !== 'none' || text.length > 0;
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
  const [schoolPublic, setSchoolPublic] = useState(false);
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
      setItems(res.data?.data?.items || []);
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
    setSchoolPublic(false);
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
        schoolPublic,
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
    fontSize: normalize(fontSizes.sm),
    color: colors.textPrimary,
  };

  const counterStyle = {
    marginTop: normalize(4),
    fontFamily: fonts.regular,
    fontSize: normalize(fontSizes.sm),
    color: colors.textMuted,
    textAlign: 'right',
  };

  const inputStyle = {
    padding: normalize(12),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: normalize(fontSizes.md),
    color: colors.textPrimary,
  };

  const renderItem = ({ item }) => {
    const expanded = expandedId === item.id;
    const cat = categoryMeta(item.category);
    const status = adminStatusMeta(item.adminResponseStatus);
    const replyText = String(item.adminResponse || '').trim();
    const showReply = hasAdminReply(item);

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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: normalize(8) }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(6) }}>
              <View
                style={{
                  paddingHorizontal: normalize(7),
                  paddingVertical: normalize(2),
                  borderRadius: normalize(999),
                  backgroundColor: cat.backgroundColor,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: normalize(10), color: cat.color }}>
                  {cat.label}
                </Text>
              </View>
              {item.reporterCount > 1 ? (
                <View
                  style={{
                    paddingHorizontal: normalize(7),
                    paddingVertical: normalize(2),
                    borderRadius: normalize(999),
                    backgroundColor: 'rgba(39, 42, 38, 0.06)',
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: normalize(10), color: colors.textSecondary }}>
                    {item.reporterCount}명 제보
                  </Text>
                </View>
              ) : null}
              {status ? (
                <View
                  style={{
                    paddingHorizontal: normalize(7),
                    paddingVertical: normalize(2),
                    borderRadius: normalize(999),
                    backgroundColor: status.backgroundColor,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: normalize(10), color: status.color }}>
                    {status.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(fontSizes.md),
                color: colors.textPrimary,
                lineHeight: normalize(22),
              }}
            >
              {item.content}
            </Text>
            <Text
              style={{
                marginTop: normalize(6),
                fontFamily: fonts.regular,
                fontSize: normalize(12),
                color: colors.textSecondary,
              }}
            >
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <Text
            style={{
              maxWidth: normalize(120),
              fontFamily: fonts.bold,
              fontSize: normalize(fontSizes.sm),
              color: colors.textSecondary,
              textAlign: 'right',
            }}
            numberOfLines={2}
          >
            {item.honoreeDisplay || '익명'}
          </Text>
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
                fontSize: normalize(11),
                color: colors.textMuted,
                marginBottom: normalize(6),
              }}
            >
              개발팀 답변
            </Text>
            {showReply ? (
              <>
                {status ? (
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: normalize(fontSizes.sm),
                      color: colors.textSecondary,
                      marginBottom: normalize(4),
                    }}
                  >
                    {status.label}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: normalize(fontSizes.sm),
                    color: colors.textPrimary,
                    lineHeight: normalize(20),
                  }}
                >
                  {replyText || '답변이 등록되었어요.'}
                </Text>
                {item.adminRespondedAt ? (
                  <Text
                    style={{
                      marginTop: normalize(6),
                      fontFamily: fonts.regular,
                      fontSize: normalize(11),
                      color: colors.textMuted,
                    }}
                  >
                    {formatDate(item.adminRespondedAt)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: normalize(fontSizes.sm),
                  color: colors.textSecondary,
                  lineHeight: normalize(20),
                }}
              >
                개발팀이 검토 중이에요. 답변이 등록되면 여기에 표시돼요.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: normalize(6), gap: normalize(4) }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: normalize(11), color: colors.textMuted }}>
              {showReply ? '답변 보기' : '탭하여 상세 보기'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={normalize(14)}
              color={colors.textMuted}
            />
          </View>
        )}
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
          fontSize: normalize(fontSizes.md),
          color: colors.textPrimary,
        }}
      >
        무엇을 전달할까요?
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: normalize(8) }}>
        {CATEGORIES.map((item) => {
          const active = category === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setCategory(item.key)}
              style={{
                paddingHorizontal: normalize(12),
                paddingVertical: normalize(8),
                borderRadius: normalize(20),
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primaryLight10 : colors.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: active ? fonts.bold : fonts.regular,
                  fontSize: normalize(fontSizes.sm),
                  color: active ? colors.primaryDark : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={fieldLabelStyle}>등재될 이름 (명예의 전당)</Text>
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

      <TouchableOpacity
        onPress={() => setSchoolPublic((v) => !v)}
        activeOpacity={0.8}
        style={{
          marginTop: normalize(12),
          flexDirection: 'row',
          alignItems: 'center',
          gap: normalize(10),
          paddingVertical: normalize(4),
        }}
      >
        <View
          style={{
            width: normalize(22),
            height: normalize(22),
            borderRadius: normalize(6),
            borderWidth: 1.5,
            borderColor: schoolPublic ? colors.primary : colors.border,
            backgroundColor: schoolPublic ? colors.primaryLight30 : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {schoolPublic ? (
            <Text style={{ fontFamily: fonts.bold, fontSize: normalize(12), color: colors.primaryDark }}>
              ✓
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.regular,
            fontSize: normalize(fontSizes.md),
            color: colors.textPrimary,
            lineHeight: normalize(20),
          }}
        >
          명예의 전당에 학교 이름도 공개할게요
        </Text>
      </TouchableOpacity>

      <Text style={fieldLabelStyle}>내용</Text>
      <TextInput
        style={{
          ...inputStyle,
          minHeight: normalize(88),
          textAlignVertical: 'top',
        }}
        multiline
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
            fontSize: normalize(fontSizes.md),
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
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
                  fontSize: normalize(fontSizes.md),
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: normalize(22),
                }}
              >
                아직 제보가 없어요.{'\n'}우측 상단에서 첫 제보를 남겨 보세요.
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
                fontSize: normalize(fontSizes.lg),
                color: colors.textPrimary,
                marginBottom: normalize(8),
              }}
            >
              감사합니다
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: normalize(fontSizes.md),
                color: colors.textSecondary,
                lineHeight: normalize(22),
              }}
            >
              소중한 피드백 감사합니다.{'\n'}
              개발팀 답변이 등록되면 목록에서 확인할 수 있어요.
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
                  fontSize: normalize(fontSizes.md),
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
