import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { colors } from '../../../styles/colors';
import { GuidePreviewProvider } from '../../../context/GuidePreviewContext';
import MainHeader from '../../../view/frame/mainHeader';
import MainFooter from '../../../view/frame/mainFooter';
import { BoardAllContent } from '../../../view/src/boardAll';
import { MessageContent } from '../../../view/src/Message';
import OurSchoolScreen from '../../../view/src/ourschoolscreen';
import { TimerContent } from '../../../view/src/timer';
import MyPage from '../../../view/src/mypage';

const ONBOARDING_KEY = '@cucumber/onboarding_completed_v1';

const GUIDE_NAVIGATION = {
  navigate: () => {},
  goBack: () => {},
  replace: () => {},
  setParams: () => {},
  addListener: () => () => {},
  removeListener: () => {},
  dispatch: () => {},
  isFocused: () => true,
  canGoBack: () => false,
};

const GUIDE_STEPS = [
  {
    backgroundComponent: BoardAllContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'board',
    focusArea: { x: 0, y: 0.82, width: 1, height: 0.1 },
    tooltipPosition: 'top',
    description: '익명으로 자유롭게 글을 쓰고\n친구들과 생각을 공유해 보세요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'note',
    focusArea: { x: 0, y: 0.08, width: 1, height: 0.13 },
    tooltipPosition: 'bottom',
    description: '게시글에서 못 다한 이야기는\n쪽지로 이어가 보세요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'note',
    focusArea: { x: 0, y: 0.35, width: 1, height: 0.1 },
    tooltipPosition: 'bottom',
    description: '친구와 사적인 대화도 나눌 수 있어요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'mail',
    focusArea: { x: 0.5, y: 0.06, width: 0.5, height: 0.07 },
    tooltipPosition: 'bottom',
    description: '속마음은 우편으로 조용히 보내 보세요\n누구든지 익명으로 보내져요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0, y: 0.55, width: 1, height: 0.28 },
    tooltipPosition: 'top',
    description: '타이머로 기록한 공부량이 잔디밭으로 쌓여요\n우리 학교 학생들의 평균 공부량을 확인해 보세요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0, y: 0.82, width: 0.5, height: 0.12 },
    tooltipPosition: 'top',
    description: '우리 학교 학생들만 들어올 수 있는 게시판이에요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0.5, y: 0.82, width: 0.5, height: 0.12 },
    tooltipPosition: 'top',
    description: '우리 학교 학생과 다른 학교 학생 모두\n우리 학교에 전하는 우편을 남길 수 있어요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0, y: 0.1, width: 1, height: 0.22 },
    tooltipPosition: 'bottom',
    description: '친구들이 공부 중인지 확인할 수 있어요\n친구가 쉬고 있다면 쿡 찔러서 같이 공부해 보세요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0, y: 0.28, width: 1, height: 0.32 },
    tooltipPosition: 'bottom',
    description: '시작 버튼을 눌러 오늘의 공부를 기록해 보세요\n공부 기록을 사진으로 저장할 수도 있어요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0, y: 0.55, width: 0.55, height: 0.4 },
    tooltipPosition: 'top',
    description: '오늘 공부할 내용을 과목별로 적어 보세요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0.45, y: 0.55, width: 0.55, height: 0.4 },
    tooltipPosition: 'top',
    description: '타이머를 시작하면 자동으로 기록돼요\n어떤 과목을 얼마나 공부했는지 한눈에 확인해 보세요',
  },
  {
    backgroundComponent: MyPage,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'mypage',
    focusArea: { x: 0.05, y: 0.25, width: 0.9, height: 0.6 },
    tooltipPosition: 'bottom',
    description: '오늘의 시간표를 확인하고 수업을 준비해 보세요\n사진으로 저장해 다른 곳에도 활용해 보세요',
  },
];

export default function GuideOverlayScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const mode = route?.params?.mode === 'guide' ? 'guide' : 'onboarding';
  const [stepIndex, setStepIndex] = useState(0);
  const step = GUIDE_STEPS[stepIndex];
  const Background = step.backgroundComponent;

  const focus = useMemo(() => {
    const x = step.focusArea.x * width;
    const y = step.focusArea.y * height;
    const w = step.focusArea.width * width;
    const h = step.focusArea.height * height;
    return { x, y, w, h };
  }, [step, width, height]);

  const finish = async () => {
    if (mode === 'onboarding') {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      navigation.replace('Main');
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GuidePreviewProvider messageTab={step.guideMessageTab || 'note'}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          edges={['top', 'bottom']}
        >
          <View key={`guide-bg-${stepIndex}`} style={{ flex: 1 }} pointerEvents="none">
            <MainHeader activeTab={step.activeTab} navigation={GUIDE_NAVIGATION} />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <Background {...(step.backgroundProps || {})} />
            </View>
            <MainFooter activeTab={step.activeTab} onTabPress={() => {}} />
          </View>
        </SafeAreaView>
      </GuidePreviewProvider>

      <Svg style={{ position: 'absolute', width, height }}>
        <Defs>
          <ClipPath id="focusHole">
            <Path
              d={`M0 0 H${width} V${height} H0 Z M${focus.x} ${focus.y} H${focus.x + focus.w} V${focus.y + focus.h} H${focus.x} Z`}
              fillRule="evenodd"
            />
          </ClipPath>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.55)" clipPath="url(#focusHole)" />
      </Svg>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top:
            step.tooltipPosition === 'bottom'
              ? Math.min(focus.y + focus.h + 12, height - 120)
              : Math.max(80, focus.y - 90),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, maxWidth: '92%' }}>
          <Text style={{ fontSize: 14, color: colors.textPrimary, textAlign: 'center' }}>{step.description}</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', top: 56, left: 12, right: 12, flexDirection: 'row', gap: 3 }}>
        {GUIDE_STEPS.map((_, idx) => (
          <View
            key={`bar-${idx}`}
            style={{ flex: 1, height: 2, backgroundColor: idx <= stepIndex ? colors.primary : 'rgba(255,255,255,0.45)' }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%' }}
        activeOpacity={1}
        onPress={() => setStepIndex((prev) => Math.max(0, prev - 1))}
      />
      <TouchableOpacity
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' }}
        activeOpacity={1}
        onPress={() => {
          if (stepIndex === GUIDE_STEPS.length - 1) {
            finish();
            return;
          }
          setStepIndex((prev) => Math.min(GUIDE_STEPS.length - 1, prev + 1));
        }}
      />

      <TouchableOpacity
        style={{ position: 'absolute', top: 68, right: 12, padding: 4, zIndex: 10 }}
        onPress={finish}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={mode === 'onboarding' ? '건너뛰기' : '나가기'}
      >
        <Entypo name="cross" size={25} color="white" />
      </TouchableOpacity>
    </View>
  );
}
