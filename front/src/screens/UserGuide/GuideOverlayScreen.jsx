import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../../../styles/colors';
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

/** evenodd 클립용: 전체 화면에서 둥근 사각형 구멍 path */
function buildFocusHolePath(outerW, outerH, x, y, w, h, radius = 0) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const outer = `M0 0 H${outerW} V${outerH} H0 Z`;
  if (r === 0) {
    return `${outer} M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  }
  const hole = [
    `M${x + r} ${y}`,
    `H${x + w - r}`,
    `A${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V${y + h - r}`,
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
  return `${outer} ${hole}`;
}

/** 말풍선 기본값 — 스텝별 tooltip 으로 덮어쓸 수 있음 */
const DEFAULT_TOOLTIP = {
  gap: 12,
  offsetY: 0,
  offsetX: 0,
  marginH: 16,
  minTop: 80,
  bottomReserve: 120,
  aboveHeight: 90,
  maxWidth: '92%',
  textAlign: 'center',
  showArrow: undefined,
};

function resolveTooltip(step) {
  const t = step.tooltip ?? {};
  const textAlign = t.textAlign ?? DEFAULT_TOOLTIP.textAlign;
  const showArrow =
    t.showArrow ?? (textAlign === 'left' || textAlign === 'right');
  return {
    gap: t.gap ?? DEFAULT_TOOLTIP.gap,
    offsetY: t.offsetY ?? DEFAULT_TOOLTIP.offsetY,
    offsetX: t.offsetX ?? DEFAULT_TOOLTIP.offsetX,
    marginH: t.marginH ?? DEFAULT_TOOLTIP.marginH,
    minTop: t.minTop ?? DEFAULT_TOOLTIP.minTop,
    bottomReserve: t.bottomReserve ?? DEFAULT_TOOLTIP.bottomReserve,
    aboveHeight: t.aboveHeight ?? DEFAULT_TOOLTIP.aboveHeight,
    maxWidth: t.maxWidth ?? DEFAULT_TOOLTIP.maxWidth,
    textAlign,
    showArrow,
  };
}

function getTooltipContainerJustify(textAlign) {
  if (textAlign === 'left') return 'flex-start';
  if (textAlign === 'right') return 'flex-end';
  return 'center';
}

function GuideTooltipDescription({ description, textAlign }) {
  const textStyle = {
    fontSize: 18,
    color: colors.background,
    fontFamily: fonts.bold,
    textAlign,
    flexShrink: 0,
  };

  return (
    <View style={{ flexShrink: 0 }}>
      {description.split('\n').map((line, index) => (
        <Text key={`${index}-${line}`} style={textStyle} numberOfLines={1}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function GuideTooltipContent({ description, layout }) {
  const { textAlign, showArrow } = layout;

  const rowStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    flexShrink: 0,
  };

  if (textAlign === 'left' && showArrow) {
    return (
      <View style={rowStyle}>
        <MaterialIcons name="keyboard-double-arrow-right" size={40} color={colors.background} />
        <GuideTooltipDescription description={description} textAlign={textAlign} />
      </View>
    );
  }

  if (textAlign === 'right' && showArrow) {
    return (
      <View style={rowStyle}>
        <GuideTooltipDescription description={description} textAlign={textAlign} />
        <MaterialIcons name="keyboard-double-arrow-left" size={40} color={colors.background} />
      </View>
    );
  }

  return (
    <View style={{ padding: 12, flexShrink: 0 }}>
      <GuideTooltipDescription description={description} textAlign={textAlign} />
    </View>
  );
}

function getTooltipTop(step, focus, screenHeight, layout) {
  const { gap, offsetY, minTop, bottomReserve, aboveHeight } = layout;
  const base =
    step.tooltipPosition === 'bottom'
      ? focus.y + focus.h + gap
      : focus.y - aboveHeight;
  const withMin = step.tooltipPosition === 'bottom' ? base : Math.max(minTop, base);
  return Math.min(withMin + offsetY, screenHeight - bottomReserve);
}

const GUIDE_STEPS = [
  {
    backgroundComponent: BoardAllContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'board',
    focusArea: { x: 0.78, y: 0.78, width: 0.2, height: 0.09 },
    focusRadius: 999,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -4, offsetX: 10, textAlign: 'right' },
    description: '익명으로 자유롭게 글을 쓰고\n친구들과 생각을 공유해 보세요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'note',
    focusArea: { x: 0, y: 0.215, width: 1, height: 0.08 },
    tooltipPosition: 'bottom',
    tooltip: { textAlign: 'left', offsetX: -10, offsetY: -10 },
    description: '게시글에서 못 다한 이야기는 쪽지로 이어가요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'note',
    focusArea: { x: 0, y: 0.445, width: 1, height: 0.08 },
    tooltipPosition: 'bottom',
    tooltip: { textAlign: 'left', offsetX: 10, offsetY: -10 },
    description: '친구와 단둘이 대화를 나눌 수도 있어요',
  },
  {
    backgroundComponent: MessageContent,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'message',
    guideMessageTab: 'mail',
    focusArea: { x: 0.78, y: 0.78, width: 0.2, height: 0.09 },
    focusRadius: 999,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -4, offsetX: 10, textAlign: 'right' },
    description: '속마음은 우편으로 조용히 보내 보세요\n누구든지 익명으로 보내져요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0.025, y: 0.62, width: 0.95, height: 0.225 },
    focusRadius: 20,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -4, offsetX: -20, textAlign: 'left' },
    description: '타이머로 기록한 공부량이 잔디밭으로 쌓여요\n우리 학교 학생들의 평균 공부량을 확인해 보세요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0.025, y: 0.585, width: 0.475, height: 0.12 },
    focusRadius: 20,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: 15, offsetX: -20, textAlign: 'left' },
    guideSchoolScrollTo: 'shortcuts',
    description: '우리 학교 학생들만 들어올 수 있는 공간이에요',
  },
  {
    backgroundComponent: OurSchoolScreen,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'school',
    focusArea: { x: 0.5, y: 0.585, width: 0.475, height: 0.12 },
    focusRadius: 20,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: 0, offsetX: 20, textAlign: 'right' },
    guideSchoolScrollTo: 'shortcuts',
    description: '재학생, 타학교 학생 모두\n 우리 학교에 전하는 우편을 남길 수 있어요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0, y: 0.135, width: 1, height: 0.13 },
    tooltipPosition: 'bottom',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -20, offsetX: -20, textAlign: 'left' },
    description: '친구들이 공부 중인지 확인할 수 있어요\n친구가 쉬고 있다면 쿡 찔러서 같이 공부해 보세요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0.025, y: 0.26, width: 0.95, height: 0.245 },
    focusRadius: 20,
    tooltipPosition: 'bottom',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -20, offsetX: -20, textAlign: 'left' },
    description: '시작 버튼을 눌러 오늘의 공부를 기록해 보세요\n공부 기록을 사진으로 저장할 수도 있어요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0.025, y: 0.515, width: 0.55, height: 0.36 },
    focusRadius: 20,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: 15, offsetX: -20, textAlign: 'left' },
    description: '오늘 공부할 내용을 과목별로 적어 보세요',
  },
  {
    backgroundComponent: TimerContent,
    backgroundProps: {},
    activeTab: 'timer',
    focusArea: { x: 0.57, y: 0.515, width: 0.41, height: 0.36 },
    focusRadius: 20,
    tooltipPosition: 'top',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: 0, offsetX: 20, textAlign: 'right' },
    description: '타이머를 시작하면 자동으로 기록돼요\n얼마나 공부했는지 한눈에 확인해 보세요',
  },
  {
    backgroundComponent: MyPage,
    backgroundProps: { navigation: GUIDE_NAVIGATION },
    activeTab: 'mypage',
    focusArea: { x: 0.06, y: 0.265, width: 0.88, height: 0.45 },
    focusRadius: 15,
    tooltipPosition: 'bottom',
    tooltip: { gap: 16, aboveHeight: 72, offsetY: -20, offsetX: -20, textAlign: 'left' },
    description: '오늘의 시간표를 확인하고 수업을 준비해 보세요\n사진으로 저장해 다른 곳에 활용할 수 있어요',
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

  const focusHolePath = useMemo(
    () =>
      buildFocusHolePath(
        width,
        height,
        focus.x,
        focus.y,
        focus.w,
        focus.h,
        step.focusRadius ?? 0,
      ),
    [width, height, focus, step.focusRadius],
  );

  const tooltipLayout = useMemo(() => resolveTooltip(step), [step]);
  const tooltipTop = useMemo(
    () => getTooltipTop(step, focus, height, tooltipLayout),
    [step, focus, height, tooltipLayout],
  );

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
      <GuidePreviewProvider
        messageTab={step.guideMessageTab || 'note'}
        schoolScrollTo={step.guideSchoolScrollTo}
      >
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
            <Path d={focusHolePath} fillRule="evenodd" />
          </ClipPath>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.55)" clipPath="url(#focusHole)" />
      </Svg>

      <View
        style={{
          position: 'absolute',
          left: tooltipLayout.marginH,
          right: tooltipLayout.marginH,
          top: tooltipTop,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: getTooltipContainerJustify(tooltipLayout.textAlign),
          transform: [{ translateX: tooltipLayout.offsetX }],
        }}
      >
        <GuideTooltipContent description={step.description} layout={tooltipLayout} />
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
