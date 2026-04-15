import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const SignStepTermsOfService = ({ normalize, onBack }) => {
  const s = makeStyles(normalize);

  const ChapterTitle = ({ children }) => <Text style={s.chapterTitle}>{children}</Text>;
  const SectionTitle = ({ children }) => <Text style={s.sectionTitle}>{children}</Text>;
  const Para = ({ children }) => <Text style={s.para}>{children}</Text>;
  const NumItem = ({ children }) => <Text style={s.numItem}>{children}</Text>;
  const SubItem = ({ children }) => <Text style={s.subItem}>{children}</Text>;
  const Divider = () => <View style={s.divider} />;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      statusBarTranslucent
      onRequestClose={onBack}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          {Platform.OS === 'ios' && <View style={s.grabber} />}
          <View style={s.sheetHeaderRow}>
            <View style={s.leftPlaceholder} />
            <Text style={s.sheetTitle}>서비스 이용약관</Text>
            <View style={s.rightPlaceholder} />
          </View>
        </View>
        <View style={s.headerDivider} />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Para>제정일: 2026-04-25 / 시행일: 2026-04-25</Para>

          <Divider />

          {/* 제1장 */}
          <ChapterTitle>제1장 총칙</ChapterTitle>

          <SectionTitle>제1조 (목적)</SectionTitle>
          <NumItem>1. 본 약관은 회사가 제공하는 모바일 애플리케이션 서비스 「Cucumber」(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무·책임사항, 이용 조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.</NumItem>
          <NumItem>2. 본 약관에서 정하지 아니한 사항은 「전기통신사업법」, 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「정보통신망법」, 「개인정보 보호법」 등 대한민국 관련 법령 및 상관례에 따릅니다.</NumItem>

          <SectionTitle>제2조 (정의)</SectionTitle>
          <Para>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</Para>
          <NumItem>1. 서비스: 회사가 이용자에게 제공하는 학교 단위 커뮤니티, 게시판, 쪽지, 우편, 알림, 검색, 학습·생활 보조 기능 등 일체의 온라인 서비스</NumItem>
          <NumItem>2. 이용자: 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원</NumItem>
          <NumItem>3. 회원: 회사와 이용계약을 체결하고 아이디(계정)를 부여받아 서비스를 이용하는 자</NumItem>
          <NumItem>4. 아이디(계정): 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인한 문자·숫자 등의 조합</NumItem>
          <NumItem>5. 비밀번호: 회원 본인 여부 확인 및 권익 보호를 위하여 회원이 설정한 문자·숫자·특수문자 등의 조합</NumItem>
          <NumItem>6. 게시물: 회원이 서비스 내에 게시한 문자, 사진, 동영상, 파일, 링크, 댓글, 우편 내용, 쪽지 메시지 등 일체의 정보</NumItem>
          <NumItem>7. 게시판: 회사가 제공하는 전체 단위 또는 소속 학교 단위의 게시 공간</NumItem>
          <NumItem>8. 쪽지(실시간 대화): 게시글 등을 기반으로 회원 간 1:1로 주고받는 실시간 메시지 기능</NumItem>
          <NumItem>9. 우편: 회원 간 또는 학교 단위로 주고받는 비실시간 메시지 형태의 기능</NumItem>
          <NumItem>10. 학생 인증: 재학 사실 확인을 위해 회사가 정한 절차(학생증 촬영·OCR 등)에 따라 제출·검증하는 행위</NumItem>
          <NumItem>11. 신고: 게시물 등이 약관·운영정책·법령에 위반된다고 판단될 때 회사에 알리는 기능</NumItem>
          <NumItem>12. 운영정책: 회사가 서비스 운영을 위해 별도로 정하여 게시하는 세부 규정·가이드라인</NumItem>

          <SectionTitle>제3조 (약관의 게시·효력·개정)</SectionTitle>
          <NumItem>1. 회사는 본 약관의 내용을 서비스 초기 화면 또는 연결 화면에 게시합니다.</NumItem>
          <NumItem>2. 회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.</NumItem>
          <NumItem>3. 약관 개정 시 적용일자 및 개정 사유를 명시하여 적용일 7일 전부터 공지합니다. 이용자에게 불리하거나 중대한 변경인 경우에는 30일 전부터 공지합니다.</NumItem>
          <NumItem>4. 공지 후 적용일까지 거부 의사를 표시하지 아니하면 개정 약관에 동의한 것으로 봅니다.</NumItem>
          <NumItem>5. 회원은 개정 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</NumItem>
          <NumItem>6. 회사는 특정 기능에 적용되는 개별약관을 둘 수 있으며, 개별약관이 본 약관과 상충하는 경우 개별약관이 우선합니다.</NumItem>

          <SectionTitle>제4조 (약관 외 준칙)</SectionTitle>
          <Para>본 약관에서 정하지 아니한 사항은 관련 법령, 개인정보처리방침, 회사가 서비스 내에 게시한 운영정책 등에 따릅니다.</Para>

          <Divider />

          {/* 제2장 */}
          <ChapterTitle>제2장 이용계약 및 회원</ChapterTitle>

          <SectionTitle>제5조 (이용계약의 성립)</SectionTitle>
          <NumItem>1. 이용계약은 이용자가 본 약관 및 개인정보처리방침에 동의한 후 회원가입을 신청하고, 회사가 이를 승낙함으로써 성립합니다.</NumItem>
          <NumItem>2. 회사는 다음에 해당하는 신청에 대하여 승낙을 거절하거나 유보할 수 있습니다.</NumItem>
          <SubItem>가. 허위 정보를 기재하거나 필수 정보를 누락한 경우</SubItem>
          <SubItem>나. 타인의 명의·정보를 도용한 경우</SubItem>
          <SubItem>다. 만 13세 미만 등 가입 자격 요건을 충족하지 못한 경우</SubItem>
          <SubItem>라. 기술적 장애, 설비 여유 부족 등 회사의 사정으로 승낙이 곤란한 경우</SubItem>
          <SubItem>마. 기타 회사의 합리적 판단에 따라 부적절하다고 인정되는 경우</SubItem>
          <NumItem>3. 만 14세 미만 회원에 대하여는 관련 법령에 따라 법정대리인의 동의가 필요합니다.</NumItem>

          <SectionTitle>제6조 (회원정보의 변경)</SectionTitle>
          <NumItem>1. 회원은 가입 시 기재한 사항이 변경된 경우 지체 없이 서비스 내 설정 기능 등을 통해 수정하여야 합니다.</NumItem>
          <NumItem>2. 변경사항을 반영하지 않아 발생한 불이익에 대하여 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</NumItem>

          <SectionTitle>제7조 (계정 관리)</SectionTitle>
          <NumItem>1. 아이디 및 비밀번호의 관리 책임은 회원에게 있으며, 제3자에게 이를 양도·대여·공유할 수 없습니다.</NumItem>
          <NumItem>2. 회원은 계정이 도용되거나 제3자가 사용하고 있음을 인지한 경우 즉시 회사에 통지하고 안내에 따라야 합니다.</NumItem>
          <NumItem>3. 통지를 태만히 하여 발생한 손해에 대하여 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</NumItem>

          <SectionTitle>제8조 (회원 탈퇴 및 자격 상실)</SectionTitle>
          <NumItem>1. 회원은 언제든지 서비스 내 탈퇴 절차를 통해 이용계약 해지를 요청할 수 있으며, 회사는 지체 없이 처리합니다.</NumItem>
          <NumItem>2. 회원이 본 약관 또는 운영정책을 위반한 경우, 회사는 사전 통지 후(긴급한 경우 사후 통지) 이용 제한·정지, 회원 자격 상실 등 필요한 조치를 취할 수 있습니다.</NumItem>
          <NumItem>3. 회원 탈퇴 후에도 타인의 권리 보호, 수사·분쟁 대응, 법령에 따른 보존 의무 등 정당한 사유가 있는 경우 게시물의 일부가 유지될 수 있습니다.</NumItem>

          <Divider />

          {/* 제3장 */}
          <ChapterTitle>제3장 서비스의 내용 및 이용</ChapterTitle>

          <SectionTitle>제9조 (서비스의 제공)</SectionTitle>
          <NumItem>1. 회사는 원칙적으로 연중무휴 1일 24시간 서비스를 제공합니다. 다만 점검·장애·통신 두절 등 불가피한 사유로 일시 중단될 수 있습니다.</NumItem>
          <NumItem>2. 회사는 서비스의 내용·화면·기능을 개선·변경할 수 있으며, 중요한 변경 시 서비스 내 공지 등으로 안내합니다.</NumItem>

          <SectionTitle>제10조 (서비스의 구체적 내용)</SectionTitle>
          <Para>회사가 현재 제공하거나 추가 개발할 수 있는 서비스의 예시는 다음과 같습니다.</Para>
          <NumItem>1. 회원가입·로그인: 전화번호 인증, 아이디·비밀번호 기반 로그인, JWT 등을 이용한 인증 상태 유지</NumItem>
          <NumItem>2. 게시판: 전체·학교 단위 게시판에서의 게시글 작성·조회·삭제, 좋아요, 스크랩, 태그 검색 등</NumItem>
          <NumItem>3. 댓글: 게시글에 대한 댓글·답글 작성·조회·삭제, 댓글 좋아요 등</NumItem>
          <NumItem>4. 신고: 게시글·댓글 등에 대한 신고 접수(사유·설명 포함)</NumItem>
          <NumItem>5. 쪽지(실시간 대화): 1:1 대화방 생성·목록·메시지 송수신, 읽음 처리, 실시간 수신 등</NumItem>
          <NumItem>6. 우편: 개인 우편·학교 우편 발송·수신·답장·읽음·삭제 등</NumItem>
          <NumItem>7. 학교·커뮤니티: 우리학교·다른 학교 관련 화면, 학교 변경, 학교 우편함·게시판 연계 등</NumItem>
          <NumItem>8. 학습·생활 보조: 집중 타이머, 시간표 추가·조회, 급식 캘린더 등</NumItem>
          <NumItem>9. 검색·탐색: 게시글·사용자 등 검색 화면 및 결과 제공</NumItem>
          <NumItem>10. 알림: 푸시·서비스 내 알림 등(설정에 따라 일부 제한 가능)</NumItem>
          <NumItem>11. 위치 정보: 이용자 동의 하에, 게시판에서 근처 글·거리 표시 등에 한하여 앱 사용 중 위치 정보를 이용할 수 있습니다.</NumItem>
          <NumItem>12. 카메라·사진·갤러리: 학생증 인증 등을 위해 카메라를 사용하거나, 게시물 첨부 등을 위해 갤러리에 접근할 수 있습니다.</NumItem>
          <NumItem>13. 학생 인증: 학생증 촬영·OCR 또는 수동 입력 등을 통한 인증 절차를 제공할 수 있습니다.</NumItem>

          <SectionTitle>제11조 (서비스 이용료)</SectionTitle>
          <Para>현재 서비스는 원칙적으로 무료로 제공됩니다. 향후 유료 기능·인앱 결제 등을 도입하는 경우, 회사는 요금·결제 방식·환불 규정 등을 사전에 고지하고 이용자의 동의를 받은 후 이를 집행합니다.</Para>

          <SectionTitle>제12조 (정보 제공 및 광고)</SectionTitle>
          <NumItem>1. 회사는 서비스 운영·개선·고지·민원 처리를 위해 필요한 정보를 서비스 화면, 알림, 전자우편 등으로 제공할 수 있습니다.</NumItem>
          <NumItem>2. 회사는 관련 법령에 따른 동의 절차를 거쳐 광고성 정보를 전송할 수 있으며, 회원은 수신 거부를 할 수 있습니다.</NumItem>
          <NumItem>3. 광고주의 판촉에 회원이 참여하여 발생한 거래·분쟁에 대하여 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</NumItem>

          <SectionTitle>제13조 (서비스 이용의 제한·중단)</SectionTitle>
          <NumItem>1. 회사는 점검, 설비 장애, 보안 사고 대응, 불법 이용 방지 등 필요한 경우 서비스의 전부 또는 일부를 제한·중단할 수 있습니다.</NumItem>
          <NumItem>2. 제1항에 따른 조치로 이용자에게 손해가 발생한 경우 관련 법령이 정하는 바에 따라 배상할 수 있습니다. 다만 회사의 고의 또는 과실이 없음을 입증한 경우에는 그러하지 아니합니다.</NumItem>

          <Divider />

          {/* 제4장 */}
          <ChapterTitle>제4장 게시물·지식재산권</ChapterTitle>

          <SectionTitle>제14조 (게시물의 책임)</SectionTitle>
          <NumItem>1. 게시물의 내용에 대한 책임은 원칙적으로 해당 게시물을 작성한 회원에게 있습니다.</NumItem>
          <NumItem>2. 회사는 게시물이 약관·운영정책·법령에 위반되거나 타인의 권리를 침해한다고 판단되는 경우, 사전 통지 없이 삭제·임시조치·노출 제한 등 필요한 조치를 취할 수 있습니다.</NumItem>

          <SectionTitle>제15조 (게시물의 이용 허락)</SectionTitle>
          <Para>회원이 서비스 내에 게시한 게시물에 대하여, 회원은 회사에게 서비스의 운영·전시·배포·검색 노출·품질 개선 등 서비스 제공에 필요한 범위에서의 비독점적 이용을 허락합니다. 회원은 언제든지 게시물 삭제 등을 통해 일부 이용을 제한할 수 있습니다.</Para>

          <SectionTitle>제16조 (저작권 등)</SectionTitle>
          <NumItem>1. 서비스 및 이에 관한 소스코드, 디자인, 로고, 데이터베이스 등에 대한 저작권 및 지식재산권은 회사에 귀속됩니다.</NumItem>
          <NumItem>2. 회원은 회사의 사전 서면 동의 없이 서비스를 복제·배포·2차적 저작물 작성 등의 방법으로 영리 목적으로 이용할 수 없습니다.</NumItem>

          <SectionTitle>제17조 (권리 침해 게시물에 대한 조치)</SectionTitle>
          <Para>관련 법령이 정한 절차에 따라 권리자가 게시중단 등을 요청하는 경우, 회사는 관련 법령에 따라 조치를 취할 수 있습니다.</Para>

          <Divider />

          {/* 제5장 */}
          <ChapterTitle>제5장 이용자의 의무 및 금지행위</ChapterTitle>

          <SectionTitle>제18조 (이용자의 일반 의무)</SectionTitle>
          <NumItem>1. 회원은 관계 법령, 본 약관, 개인정보처리방침, 운영정책, 서비스 내 안내를 준수하여야 합니다.</NumItem>
          <NumItem>2. 회원은 허위 정보를 제공하여서는 아니 되며, 소속 정보를 타인에게 피해를 주는 방식으로 조작하여서는 아니 됩니다.</NumItem>

          <SectionTitle>제19조 (금지행위)</SectionTitle>
          <Para>회원은 다음 각 호의 행위를 하여서는 아니 됩니다.</Para>
          <NumItem>1. 타인의 계정·비밀번호를 도용하거나, 계정을 양도·판매·공유하는 행위</NumItem>
          <NumItem>2. 회사 또는 제3자의 저작권·상표권 등 지식재산권을 침해하는 행위</NumItem>
          <NumItem>3. 다른 회원 또는 제3자를 비방·모욕·위협·스토킹하거나, 사생활·개인정보를 무단 수집·유포하는 행위</NumItem>
          <NumItem>4. 음란·폭력·혐오·자해 조장, 불법 행위 교사 등 공서양속에 반하는 정보를 게시하는 행위</NumItem>
          <NumItem>5. 악성 코드, 스팸, 자동화 수단(봇) 등을 이용하여 서비스의 정상 운영을 방해하는 행위</NumItem>
          <NumItem>6. 크롤링·스크래핑 등 회사가 허용하지 아니한 방법으로 데이터를 수집하는 행위</NumItem>
          <NumItem>7. 서비스를 이용한 불법 거래, 금품 요구, 사기, 명예훼손 등 범죄에 해당하거나 이에 준하는 행위</NumItem>
          <NumItem>8. 운영자·회사를 사칭하는 행위</NumItem>
          <NumItem>9. 기타 불법하거나 부당한 행위</NumItem>

          <SectionTitle>제20조 (위반 시 조치)</SectionTitle>
          <Para>회사는 회원이 본 약관을 위반한 경우 경고, 게시물 삭제, 기능 제한, 일시 정지, 영구 이용 정지, 재가입 제한, 민·형사상 조치 등을 취할 수 있습니다.</Para>

          <Divider />

          {/* 제6장 */}
          <ChapterTitle>제6장 면책·손해배상·분쟁 해결</ChapterTitle>

          <SectionTitle>제21조 (면책)</SectionTitle>
          <NumItem>1. 회사는 천재지변, 전쟁, 기간통신사업자의 회선 장애, 이용자 단말의 문제 등 회사의 합리적 통제 범위를 벗어난 사유로 서비스를 제공할 수 없는 경우 책임이 면제될 수 있습니다.</NumItem>
          <NumItem>2. 회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대하여 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</NumItem>
          <NumItem>3. 회사는 회원이 게재한 정보의 진실성·적법성·완전성을 보증하지 아니합니다.</NumItem>

          <SectionTitle>제22조 (손해배상)</SectionTitle>
          <Para>회원이 본 약관을 위반하여 회사에 손해를 끼친 경우, 회원은 회사에 그 손해를 배상하여야 합니다.</Para>

          <SectionTitle>제23조 (준거법 및 관할)</SectionTitle>
          <NumItem>1. 본 약관의 해석 및 회사와 회원 간 분쟁에는 대한민국법을 적용합니다.</NumItem>
          <NumItem>2. 소송이 제기되는 경우 관할법원은 관련 법령에 따른 관할에 따르며, 회사의 주소지를 관할하는 지방법원을 제1심 관할로 합니다.</NumItem>

          <Divider />

          <SectionTitle>부칙</SectionTitle>
          <Para>본 약관은 2026년 4월 25일부터 시행합니다.</Para>
        </ScrollView>
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
    chapterTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
      marginTop: normalize(8),
      marginBottom: normalize(2),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(4),
      marginBottom: normalize(6),
    },
    para: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    numItem: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      paddingLeft: normalize(4),
    },
    subItem: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      paddingLeft: normalize(16),
    },
    divider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginVertical: normalize(6),
    },
  });

export default SignStepTermsOfService;
