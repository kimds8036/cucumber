import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

const GUIDE_STEPS = [
  {
    step: '01',
    title: '네이버 앱 열기',
    descriptionParts: [
      '네이버 앱을 실행한 뒤, ',
      { bold: '좌측 상단 메뉴 아이콘(☰)' },
      '을 탭하세요',
    ],
    image: require('../../../assets/guide1.png'),
    /** guide1만 가로형 — 고정 세로 비율(1.85) 대신 원본 높이비 사용 */
    imageHeightRatio: 638 / 1206,
  },
  {
    step: '02',
    title: '전자증명서 찾기',
    descriptionParts: [
      '인증 카테고리에서 ',
      { bold: "'전자증명서'" },
      '를 선택하세요',
    ],
    image: require('../../../assets/guide2.png'),
  },
  {
    step: '03',
    title: '증명서 종류 선택',
    descriptionParts: [
      '증명서 목록에서 ',
      { bold: "'초중고 졸업(예정)증명서'" },
      '를 선택하세요',
    ],
    image: require('../../../assets/guide3.png'),
  },
  {
    step: '04',
    title: '학교 검색 및 약관 동의',
    descriptionParts: [
      '재학 중인 학교를 검색한 뒤 ',
      { bold: "'신청하기'" },
      '를 탭하세요 (주민등록번호 뒷자리는 가려주세요)',
    ],
    image: require('../../../assets/guide4.png'),
  },
  {
    step: '05',
    title: '증명서 발급 완료',
    descriptionParts: [
      '증명서 발급이 완료되면 하단에 ',
      { bold: "'공유'" },
      ' 버튼을 탭하세요',
    ],
    image: require('../../../assets/guide5.png'),
  },
  {
    step: '06',
    title: '공유 주소 발급 & 제출',
    descriptionParts: [
      '열람용 주소가 생성되면 ',
      { bold: '해당 주소와 열람번호' },
      '를 회원가입 인증 화면에 붙여넣어 주세요',
    ],
    image: require('../../../assets/guide6.png'),
  },
];

const SCROLL_BOTTOM_THRESHOLD = 32;

function GuideStepDescription({ parts, styles }) {
  return (
    <Text style={styles.certificateGuideStepDescription}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return part;
        }
        return (
          <Text
            key={`${part.bold}-${index}`}
            style={styles.certificateGuideStepDescriptionBold}
          >
            {part.bold}
          </Text>
        );
      })}
    </Text>
  );
}

const SignStepCertificateGuide = ({
  styles,
  onProceed,
  insetBody = true,
}) => {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const bodyStyle = useMemo(
    () => ({
      ...(insetBody
        ? {
            marginHorizontal: -width * 0.04,
            paddingHorizontal: width * 0.07,
          }
        : {}),
    }),
    [width, insetBody],
  );

  const markReachedBottom = useCallback(() => {
    setHasReachedBottom(true);
  }, []);

  const handleScroll = useCallback(
    (event) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - SCROLL_BOTTOM_THRESHOLD
      ) {
        markReachedBottom();
      }
    },
    [markReachedBottom],
  );

  const handleContentSizeChange = useCallback(
    (_contentWidth, contentHeight) => {
      if (viewportHeight > 0 && contentHeight <= viewportHeight + 8) {
        markReachedBottom();
      }
    },
    [viewportHeight, markReachedBottom],
  );

  return (
    <View
      style={[
        styles.ageGateContainer,
        styles.certificateGuideContainer,
        bodyStyle,
      ]}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.certificateGuideScroll}
        contentContainerStyle={styles.certificateGuideScrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={(event) =>
          setViewportHeight(event.nativeEvent.layout.height)
        }
      >
        {GUIDE_STEPS.map((item) => (
          <View key={item.step} style={styles.certificateGuideStepBlock}>
            <View style={styles.certificateGuideStepHeader}>
              <Text style={styles.certificateGuideStepNumber}>
                {item.step}
              </Text>
              <Text style={styles.certificateGuideStepTitle}>{item.title}</Text>
            </View>
            <GuideStepDescription
              parts={item.descriptionParts}
              styles={styles}
            />
            <Image
              source={item.image}
              style={[
                styles.certificateGuideStepImage,
                item.imageHeightRatio != null
                  ? {
                      height:
                        styles.certificateGuideStepImage.width *
                        item.imageHeightRatio,
                    }
                  : null,
              ]}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>
      <View style={[styles.footerSection, { paddingHorizontal: 0 }]}>
        {!hasReachedBottom ? (
          <Text style={[styles.certificateGuideScrollHint, { marginBottom: 8 }]}>
            가이드를 끝까지 내려 확인해 주세요
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !hasReachedBottom && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!hasReachedBottom}
          onPress={onProceed}
        >
          <Text
            style={[
              styles.primaryButtonText,
              !hasReachedBottom && styles.primaryButtonTextDisabled,
            ]}
          >
            제출하러 가기
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignStepCertificateGuide;
