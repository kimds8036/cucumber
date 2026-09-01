import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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

const DeveloperWhack = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [category, setCategory] = useState('bug');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [thanksVisible, setThanksVisible] = useState(false);

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || '';
  const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmed = content.trim();
    if (trimmed.length < 5) {
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/developer-feedback', {
        category,
        content: trimmed,
        appVersion: appVersion || undefined,
        deviceInfo: deviceInfo || undefined,
      });
      setContent('');
      setThanksVisible(true);
    } catch (e) {
      console.warn('[DeveloperWhack] submit failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <SubHeader title="회초리" onBack={() => navigation.goBack()} />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: normalize(16),
          paddingBottom: normalize(32),
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            marginTop: normalize(12),
            padding: normalize(16),
            borderRadius: normalize(12),
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: normalize(fontSizes.lg),
              color: colors.textPrimary,
            }}
          >
            도움 주신 분들 (명예의 전당)
          </Text>
          <Text
            style={{
              marginTop: normalize(8),
              fontFamily: fonts.regular,
              fontSize: normalize(fontSizes.md),
              color: colors.textSecondary,
              lineHeight: normalize(20),
            }}
          >
            반영된 의견과 감사 인사는 준비 중이에요. 곧 이곳에서 볼 수 있어요.
          </Text>
        </View>

        <Text
          style={{
            marginTop: normalize(20),
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
                  backgroundColor: active ? colors.primaryLight10 : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    fontFamily: active ? fonts.bold : fonts.regular,
                    fontSize: normalize(fontSizes.sm),
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={{
            marginTop: normalize(12),
            minHeight: normalize(140),
            padding: normalize(12),
            borderRadius: normalize(10),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            fontFamily: fonts.regular,
            fontSize: normalize(fontSizes.md),
            color: colors.textPrimary,
            textAlignVertical: 'top',
          }}
          multiline
          placeholder="불편했던 점이나 바라는 기능을 자유롭게 적어 주세요."
          value={content}
          onChangeText={setContent}
          {...themedTextInputProps}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || content.trim().length < 5}
          style={{
            marginTop: normalize(16),
            paddingVertical: normalize(14),
            borderRadius: normalize(10),
            backgroundColor:
              submitting || content.trim().length < 5
                ? colors.textLight20
                : colors.primary,
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
              backgroundColor: colors.cardBackground,
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
              의견이 수용되면 명예의 전당에 올라갈 수 있어요.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setThanksVisible(false);
                navigation.goBack();
              }}
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
