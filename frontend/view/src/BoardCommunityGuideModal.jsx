import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../styles/colors';
import Skeleton from '../../components/common/Skeleton';

/** 글쓰기 화면용 커뮤니티 가이드 (SignStepPrivacyPolicy 약관 모달과 동일 레이아웃·여백) */
const BoardCommunityGuideModal = ({ visible, normalize, onClose }) => {
  const s = makeStyles(normalize);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    setReady(false);
    const timer = setTimeout(() => setReady(true), 180);
    return () => clearTimeout(timer);
  }, [visible]);

  const Para = ({ children }) => (
    <Text style={s.para}>{children}</Text>
  );

  const Divider = () => <View style={s.divider} />;

  const Bullet = ({ children }) => (
    <Text style={s.bullet}>
      {'• '}
      {children}
    </Text>
  );

  const Quote = ({ children }) => (
    <Text style={s.quote}>{children}</Text>
  );

  const SubTitle = ({ children }) => (
    <Text style={s.subTitle}>{children}</Text>
  );

  const CategoryTitle = ({ children }) => (
    <Text style={s.categoryTitle}>{children}</Text>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          {Platform.OS === 'ios' && <View style={s.grabber} />}
          <View style={s.sheetHeaderRow}>
            <View style={s.leftPlaceholder} />
            <Text
              style={[s.sheetTitle, Platform.OS === 'android' && s.sheetTitleAndroid]}
              numberOfLines={1}
            >
              커뮤니티 가이드
            </Text>
            {Platform.OS === 'android' ? (
              <TouchableOpacity
                onPress={onClose}
                style={s.androidConfirmButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="확인"
              >
                <Text style={s.androidConfirmText}>확인</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.rightPlaceholder} />
            )}
          </View>
        </View>
        <View style={s.headerDivider} />
        {!ready ? (
          <View style={[s.scrollContent, { flex: 1 }]}>
            <Skeleton width="45%" height={normalize(20)} borderRadius={normalize(8)} style={{ marginBottom: normalize(10) }} />
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <Skeleton
                key={`guide-skel-${idx}`}
                width="100%"
                height={normalize(idx % 2 === 0 ? 16 : 52)}
                borderRadius={normalize(8)}
                style={{ marginBottom: normalize(8) }}
              />
            ))}
          </View>
        ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Para>
            유스(Youth)는 학생들의 정보 교류를 목적으로 개설되었습니다.
          </Para>
          <Para>
            아래의 제재 사항에 해당하는 행동을 할 경우, 경고와 함께 일시적인 제재 조치가
            가해지며 행위의 심각성과 제재 이력에 따라 단계적인 활동 정지가 적용됩니다.
          </Para>

          <Bullet>경고 : 이용 제한 없음</Bullet>
          <Bullet>1차 위반 : 1일 이용 제한</Bullet>
          <Bullet>2차 위반 : 7일 이용 제한</Bullet>
          <Bullet>3차 위반 : 30일 이용 제한</Bullet>
          <Bullet>4차 위반 : 6개월 이용 제한</Bullet>
          <Bullet>5차 위반 : 영구 이용 제한</Bullet>

          <Divider />

          <SubTitle>🚨 주의사항</SubTitle>
          <Bullet>
            신고 내용 및 피신고자의 과거 이용 기록을 종합적으로 판단하여 제재 수준을 결정하고
            있습니다. (글 또는 댓글을 삭제하더라도 운영팀에서는 일정 기간의 과거 이용 내역
            확인할 수 있습니다.)
          </Bullet>
          <Bullet>
            반복적으로 운영정책에 위반한 행위를 한 경우, 1회 위반이라고 하더라도 1차 위반 이상의
            제재가 이루어질 수 있으며, 위반의 정도와 심각성에 따라 즉시 영구 이용 제한될 수
            있습니다.
          </Bullet>
          <Bullet>
            제재 해지는 제재 시작일에서 제재 기간만큼 더한 날의 23:59이 넘어간 새벽에 제재가
            해제됩니다.
          </Bullet>

          <Divider />

          <SubTitle>🚨 커뮤니티 이용 규정</SubTitle>
          <Para>
            OO은 모든 이용자가 안전하고 건강하게 소통할 수 있는 공간을 만들기 위해 아래 규정을
            운영합니다. 규정 위반 시 경고 없이 게시글 삭제 및 계정 제재가 이루어질 수 있습니다.
          </Para>

          <Divider />

          <CategoryTitle>[욕설 · 비방 · 혐오 · 갈등 조장]</CategoryTitle>
          <Quote>
            건강한 커뮤니티 문화 조성과 이용자 간 상호 존중을 위해, 타인에게 정신적 피해를 줄 수
            있는 모든 언행을 금지합니다.
          </Quote>
          <Bullet>과도한 욕설, 비방, 비하, 비아냥거리는 표현</Bullet>
          <Bullet>
            성별, 지역, 장애, 인종, 종교 등에 대한 차별·편견·혐오 표현 및 갈등 조장
          </Bullet>
          <Bullet>다른 이용자를 특정 이념·사상의 지지자로 몰아가는 행위</Bullet>
          <Bullet>
            과도한 정치·종교 관련 내용, 또는 이를 미루어 짐작할 수 있는 비유·은어 사용
          </Bullet>
          <Bullet>특정 이용자를 반복적으로 겨냥한 비방 게시물 작성</Bullet>
          <Bullet>타인을 협박하거나 사이버 폭력에 해당하는 행위 (명예훼손 해당)</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[음란 · 불건전 · 자극적인 게시물]</CategoryTitle>
          <Quote>
            청소년보호법 및 아동·청소년의 성보호에 관한 법률에 따라, 미성년자에게 유해한 모든
            음란·불건전 콘텐츠의 게시를 금지합니다.
          </Quote>
          <Bullet>음란물, 음담패설, 야동, 외설 등 미성년자 유해 매체물 게시</Bullet>
          <Bullet>
            술·담배·마약·도박 등 청소년에게 유해한 행위를 조장하거나 조장할 우려가 있는 내용
          </Bullet>
          <Bullet>
            성적 행위 또는 관련 내용(성관계, 자위, 🔞, 19금 등)을 표현·묘사하는 행위
          </Bullet>
          <Bullet>성적 관련 단어나 기호를 활용해 내용과 무관하게 관심을 유도하는 게시물</Bullet>
          <Bullet>신체 부위가 강조된 사진 또는 노출이 심한 사진 게시</Bullet>
          <Bullet>성적 수치심이나 불쾌감을 유발할 수 있는 내용 게시</Bullet>
          <Bullet>불건전한 모임·대화·통화 등을 유도하는 행위</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[개인정보 · 신체 사진 공유]</CategoryTitle>
          <Quote>
            개인정보 보호법 및 이용자 안전 보호를 위해, 본인 또는 타인의 개인정보와 식별 가능한
            사진의 공개를 금지합니다. 게시된 정보는 스토킹·사칭·딥페이크 등 2차 피해로 이어질 수
            있습니다.
          </Quote>
          <Bullet>이름·학교·지역 등을 포함하여 자신 또는 타인을 특정할 수 있는 게시글 작성</Bullet>
          <Bullet>
            타인의 개인정보를 요구하거나 공개된 채널에 노출하는 행위 (개인정보 보호법 위반)
          </Bullet>
          <Bullet>
            얼굴이 식별되는 사진 공유 — 눈·코·입 개별 사진 또는 얼굴을 가린 사진은 허용
          </Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[외부 계정 공유 · 외부 만남 유도 · 친목 조성]</CategoryTitle>
          <Quote>
            이용자 안전 보호 및 서비스 취지 유지를 위해 외부 채널 연결과 사적 만남 유도를
            금지합니다. 외부 채널 유인은 그루밍·사기·성범죄의 전형적인 경로가 될 수 있으며, 소수
            친목 모임 조성은 다른 이용자에게 소외감을 줄 수 있습니다.
          </Quote>
          <Bullet>
            인스타그램 등 SNS·메신저·게임 ID·닉네임 등 외부 계정 정보 공유
          </Bullet>
          <Bullet>앱 외부에서의 온·오프라인 사적 만남 유도 (오픈채팅방, 게임 친구 추가 등)</Bullet>
          <Bullet>다른 이용자에게 위화감을 줄 수 있는 별도의 친목 모임 조성</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[광고 · 홍보 · 금전적 이득 행위]</CategoryTitle>
          <Quote>
            서비스의 공정한 이용 환경 유지와 이용자 피해 방지를 위해, 상업적 목적의 모든 게시
            행위를 금지합니다.
          </Quote>
          <Bullet>기업·비영리기관·개인·단체의 직간접적인 광고·홍보·판매 행위</Bullet>
          <Bullet>계정 공유, 홍보 요청, 바이럴 이벤트 등 게시물 대리 작성</Bullet>
          <Bullet>어플리케이션, 웹사이트, 블로그, 카페, 외부 서비스 홍보</Bullet>
          <Bullet>다단계 판매, 사행성 조장, 불법 거래 유도</Bullet>
          <Bullet>기타 광고·홍보·판매 관련 게시물 일체</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>
          <Para>※ 단, OO과 계약한 광고 관련 게시물은 제재 대상에 해당하지 않습니다.</Para>

          <Divider />

          <CategoryTitle>[도배 · 서비스 악용 · 운영자 사칭]</CategoryTitle>
          <Quote>
            원활한 서비스 운영과 모든 이용자의 공정한 이용 환경 보장을 위해, 시스템을 악용하는
            행위를 금지합니다.
          </Quote>
          <Bullet>동일한 주제·내용의 게시물을 반복적으로 게시하는 도배 행위</Bullet>
          <Bullet>허위 신고 등 신고 시스템 악용</Bullet>
          <Bullet>다른 이용자의 규정 위반을 유도하는 행위</Bullet>
          <Bullet>운영자 또는 이에 준하는 자격을 사칭하여 권한을 행사하는 행위</Bullet>
          <Bullet>
            타인 명의의 계정 도용, 봇을 통한 시스템 조작, 허위 가입 등 비정상적인 계정 활동
          </Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[불법 행위 · 초상권 · 저작권 침해]</CategoryTitle>
          <Quote>
            저작권법, 정보통신망법 등 관련 법령에 따라 타인의 권리를 침해하거나 서비스 시스템에
            악영향을 미치는 모든 행위를 금지합니다. 위반 시 민·형사상 책임은 전적으로 작성자
            본인에게 있습니다.
          </Quote>
          <Bullet>초상권·저작권 등 타인의 권리를 침해하는 행위</Bullet>
          <Bullet>불법 다운로드 링크 공유, 해킹 프로그램·바이러스 유포</Bullet>
          <Bullet>
            커뮤니티 내용 무단 유출, 시스템 해킹, 게시물 크롤링 등 서비스에 악영향을 주는 행위
          </Bullet>
          <Bullet>서비스 시스템을 역설계·복제하는 행위</Bullet>
          <Bullet>기타 관련 법률에 위반되는 행위 일체</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <CategoryTitle>[자살 · 자해 관련 정보]</CategoryTitle>
          <Quote>
            자살예방 및 생명존중문화 조성을 위한 법률(자살예방법)에 따라, 자살·자해를 조장하거나
            촉진할 수 있는 모든 정보의 게시를 금지합니다.
          </Quote>
          <Bullet>자살·자해 동반자 모집 정보</Bullet>
          <Bullet>자살·자해에 관한 구체적인 방법을 제시하는 정보</Bullet>
          <Bullet>자살·자해를 실행하거나 유도하는 문서·사진·동영상 등</Bullet>
          <Bullet>자살위해물건의 판매 또는 활용에 관한 정보</Bullet>
          <Bullet>기타 명백히 자살·자해 유발을 목적으로 하는 정보</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>
          <Para>
            ※ 이용자의 생명·안전에 급박한 위험이 확인되는 경우, 자살예방법 제19조의3에 의거하여
            해당 이용자의 개인정보를 긴급구조기관(경찰·소방 등)에 제공할 수 있습니다.
          </Para>

          <Divider />

          <CategoryTitle>[혐오 콘텐츠 · 시스템 취약점 악용]</CategoryTitle>
          <Quote>
            쾌적한 이용 환경 유지를 위해, 일반적으로 혐오감을 주는 콘텐츠 및 시스템을 악용한 게시
            행위를 금지합니다.
          </Quote>
          <Bullet>
            잔인한 사진, 사체·고어 이미지, 방뇨·배설 등 혐오감을 주는 사진 또는 내용
          </Bullet>
          <Bullet>시스템의 취약점을 이용하여 유해한 내용을 게시하는 행위</Bullet>
          <Bullet>자동화·패턴 글 등 프로그램을 이용한 비정상적인 게시물 등록</Bullet>
          <Bullet>위 사항을 간접적으로 유추 가능하게 하거나 타인에게 유도하는 행위</Bullet>

          <Divider />

          <Para>
            ※ 법령 위반 사항에 대해서는 관련 법령 또는 관계기관의 요청에 따라 조치할 수 있습니다.
          </Para>
          <Para>
            ※ 본 규정은 서비스 운영 방침에 따라 사전 예고 없이 변경될 수 있습니다.
          </Para>
        </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    sheetHeader: {
      backgroundColor: colors.background,
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
    },
    grabber: {
      alignSelf: 'center',
      width: normalize(36),
      height: normalize(5),
      borderRadius: normalize(999),
      backgroundColor: colors.textLight20,
      marginTop: normalize(2),
      marginBottom: normalize(8),
    },
    sheetHeaderRow: {
      height: normalize(34),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftPlaceholder: {
      minWidth: normalize(44),
    },
    sheetTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    sheetTitleAndroid: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: normalize(4),
    },
    androidConfirmButton: {
      minWidth: normalize(44),
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(4),
      justifyContent: 'center',
      alignItems: 'center',
    },
    androidConfirmText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    rightPlaceholder: {
      minWidth: normalize(44),
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.textLight20,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: normalize(20),
      paddingTop: normalize(16),
      paddingBottom: normalize(32),
      gap: normalize(8),
    },
    subTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(8),
      marginBottom: normalize(4),
    },
    categoryTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(8),
      marginBottom: normalize(4),
    },
    para: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    quote: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      paddingLeft: normalize(10),
      marginTop: normalize(2),
      marginBottom: normalize(4),
      borderLeftWidth: normalize(3),
      borderLeftColor: colors.textLight20,
    },
    bullet: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      paddingLeft: normalize(4),
    },
    divider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginVertical: normalize(6),
    },
  });

export default BoardCommunityGuideModal;
