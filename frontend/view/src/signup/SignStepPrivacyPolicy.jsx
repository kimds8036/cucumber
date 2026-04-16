import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const SignStepPrivacyPolicy = ({ normalize, onBack }) => {
  const s = makeStyles(normalize);

  const SectionTitle = ({ children }) => (
    <Text style={s.sectionTitle}>{children}</Text>
  );

  const Para = ({ children }) => (
    <Text style={s.para}>{children}</Text>
  );

  const TableHeader = ({ cols }) => (
    <View style={[s.tableRow, s.tableHeaderRow]}>
      {cols.map((col, i) => (
        <Text key={i} style={[s.tableCell, s.tableCellHeader, i === 0 && s.tableCellFirst]}>
          {col}
        </Text>
      ))}
    </View>
  );

  const TableRow = ({ cells }) => (
    <View style={s.tableRow}>
      {cells.map((cell, i) => (
        <Text key={i} style={[s.tableCell, i === 0 && s.tableCellFirst]}>
          {cell}
        </Text>
      ))}
    </View>
  );

  const Divider = () => <View style={s.divider} />;

  const Bullet = ({ children }) => (
    <Text style={s.bullet}>{'• '}{children}</Text>
  );

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
            <Text style={s.sheetTitle}>개인정보 처리방침</Text>
            <View style={s.rightPlaceholder} />
          </View>
        </View>
        <View style={s.headerDivider} />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Para>
            [상호명](이하 "회사")은 「Cucumber」 모바일 애플리케이션 서비스(이하 "서비스")와 관련하여
            정보주체의 개인정보를 중요하게 여기며, 「개인정보 보호법」, 「정보통신망 이용촉진 및
            정보보호 등에 관한 법률」 등 관련 법령을 준수합니다.
          </Para>
          <Para>
            본 처리방침은 법령의 변경 또는 회사 정책에 따라 변경될 수 있으며, 변경 시 서비스 내
            공지 등을 통해 안내합니다.
          </Para>

          <Divider />

          {/* 제1조 */}
          <SectionTitle>제1조 수집하는 개인정보 항목</SectionTitle>

          <Text style={s.subTitle}>1. 회원가입 및 계정 관리 (필수)</Text>
          <View style={s.table}>
            <TableHeader cols={['구분', '항목']} />
            <TableRow cells={['계정·본인 확인', '사용자명(아이디), 비밀번호(암호화 저장), 이름, 휴대전화번호, 생년월일']} />
            <TableRow cells={['학교 소속', '학교명 등 학교 식별 정보, 학년, 반, 졸업예정연도']} />
            <TableRow cells={['프로필 표시', '프로필 컬러']} />
            <TableRow cells={['가입·인증 과정', '전화번호 인증을 위한 인증번호 발송·검증 과정에서의 휴대전화번호, 인증 시각 등']} />
          </View>

          <Text style={s.subTitle}>2. 서비스 이용 과정에서 생성·수집되는 정보</Text>
          <View style={s.table}>
            <TableHeader cols={['구분', '항목']} />
            <TableRow cells={['로그인·보안', '단말 식별자, 단말 정보(User-Agent 등), IP 주소, 최종 로그인 시각']} />
            <TableRow cells={['게시판·커뮤니티', '게시글·댓글·좋아요·스크랩·해시태그, 게시글 작성 시 선택적으로 수집되는 위도·경도']} />
            <TableRow cells={['이미지', '게시글·댓글·쪽지·DM 등에 첨부하는 사진·이미지 파일']} />
            <TableRow cells={['쪽지·DM', '대화방·메시지 내용, 읽음 여부, 삭제·복구 관련 상태값']} />
            <TableRow cells={['친구', '친구 요청·수락·거절 등 관계 정보']} />
            <TableRow cells={['신고', '신고 대상·사유·상세 내용']} />
            <TableRow cells={['타이머·학습', '일별 공부 시간, 과목·메모 등 이용자가 입력한 데이터']} />
            <TableRow cells={['학생 인증(선택)', '학생증 이미지 URL, OCR 추출 JSON 등']} />
          </View>

          <Text style={s.subTitle}>3. 자동 수집 장치</Text>
          <Bullet>서비스 이용 과정에서 OS·앱 버전, 단말 식별자, IP, 이용 기록 등이 자동 생성되어 수집·저장될 수 있습니다.</Bullet>
          <Bullet>향후 분석 SDK·광고 SDK를 도입하는 경우 별도 동의 및 본 방침 개정을 통해 안내합니다.</Bullet>

          <Divider />

          {/* 제2조 */}
          <SectionTitle>제2조 개인정보의 수집·이용 목적</SectionTitle>
          <Bullet>회원 가입·의사 확인, 본인 확인, 중복 가입 방지, 만 14세 미만 여부 판단 및 법정대리인 동의 절차</Bullet>
          <Bullet>서비스 제공: 게시판, 댓글, 쪽지·DM, 우편, 검색, 친구, 알림, 타이머, 급식·시간표 연동 등</Bullet>
          <Bullet>서비스 개선·통계: 품질 향상, 이용 패턴 분석</Bullet>
          <Bullet>부정 이용 방지·보안: 약관 위반 조사, 계정 도용 방지</Bullet>
          <Bullet>민원 처리: 신고 접수·처리, 고객 문의 대응</Bullet>
          <Bullet>법령 준수: 수사기관의 적법한 요청에 따른 제공 등</Bullet>

          <Divider />

          {/* 제3조 */}
          <SectionTitle>제3조 개인정보의 보유 및 이용 기간</SectionTitle>
          <Bullet>원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다.</Bullet>
          <Bullet>관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</Bullet>
          <Bullet>파기 방법: 전자적 파일은 복구 불가능한 방법으로 삭제, 출력물은 분쇄 또는 소각</Bullet>

          <Divider />

          {/* 제4조 */}
          <SectionTitle>제4조 개인정보의 제3자 제공</SectionTitle>
          <Para>
            회사는 정보주체의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 정보주체가 사전에
            동의한 경우, 법령에 특별한 규정이 있거나 수사·감독 목적의 적법한 요청이 있는 경우는
            예외로 합니다.
          </Para>

          <Divider />

          {/* 제5조 */}
          <SectionTitle>제5조 개인정보 처리 위탁</SectionTitle>
          <View style={s.table}>
            <TableHeader cols={['수탁업체', '위탁 업무 내용']} />
            <TableRow cells={['클라우드·호스팅 사업자', '데이터 저장, 서버 운영']} />
            <TableRow cells={['이미지 저장(CDN 등)', '첨부 이미지 호스팅']} />
            <TableRow cells={['문자·알림 발송 대행업체', '전화번호 인증 문자 발송']} />
          </View>

          <Divider />

          {/* 제6조 */}
          <SectionTitle>제6조 정보주체의 권리·의무 및 행사 방법</SectionTitle>
          <Para>
            정보주체는 언제든지 개인정보 열람 요구, 오류 등이 있을 경우 정정·삭제 요구, 처리 정지
            요구의 권리를 행사할 수 있습니다. 권리 행사는 서비스 내 설정, 고객센터 이메일 등을 통해
            가능하며, 회사는 지체 없이 조치합니다.
          </Para>
          <Para>
            만 14세 미만 아동의 경우 법정대리인이 권리를 행사할 수 있으며, 회사는 법령에 따라
            법정대리인 동의 확인 절차를 둘 수 있습니다.
          </Para>

          <Divider />

          {/* 제7조 */}
          <SectionTitle>제7조 개인정보의 안전성 확보 조치</SectionTitle>
          <Bullet>관리적 조치: 내부관리계획 수립, 접근 권한 최소화</Bullet>
          <Bullet>기술적 조치: 비밀번호 암호화 저장, 접근 통제, 전송 구간 보안(HTTPS 등)</Bullet>
          <Bullet>물리적 조치: 서버실·자료실 접근 통제</Bullet>

          <Divider />

          {/* 제8조 */}
          <SectionTitle>제8조 개인정보 보호책임자</SectionTitle>
          <View style={s.infoBox}>
            <Text style={s.infoRow}><Text style={s.infoLabel}>성명</Text>  김은채</Text>
            <Text style={s.infoRow}><Text style={s.infoLabel}>직책</Text>  서비스 운영 담당</Text>
            <Text style={s.infoRow}><Text style={s.infoLabel}>이메일</Text>  eunchae6589@gmail.com</Text>
            <Text style={s.infoRow}><Text style={s.infoLabel}>전화</Text>  010-9237-6589</Text>
          </View>

          <Divider />

          {/* 제9조 */}
          <SectionTitle>제9조 권익침해 구제 방법</SectionTitle>
          <Bullet>개인정보 침해신고센터: (국번없이) 118 — privacy.kisa.or.kr</Bullet>
          <Bullet>경찰청 사이버수사국: (국번없이) 182 — ecrm.cyber.go.kr</Bullet>
          <Bullet>개인정보 분쟁조정위원회: 1833-6972 — www.kopico.go.kr</Bullet>

          <Divider />

          {/* 제10조 */}
          <SectionTitle>제10조 고지의 의무</SectionTitle>
          <Para>공고일 및 시행일: 2026년 4월 25일</Para>
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
    sectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(4),
      marginBottom: normalize(6),
    },
    subTitle: {
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
    table: {
      borderWidth: 1,
      borderColor: colors.textLight20,
      borderRadius: normalize(8),
      overflow: 'hidden',
      marginTop: normalize(4),
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
    },
    tableHeaderRow: {
      borderTopWidth: 0,
      backgroundColor: colors.primaryLight10,
    },
    tableCell: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      padding: normalize(8),
      lineHeight: normalize(18),
    },
    tableCellFirst: {
      flex: 0,
      width: normalize(90),
      borderRightWidth: 1,
      borderRightColor: colors.textLight10,
    },
    tableCellHeader: {
      fontFamily: fonts.bold,
    },
    infoBox: {
      backgroundColor: colors.surface,
      borderRadius: normalize(12),
      padding: normalize(14),
      gap: normalize(4),
    },
    infoRow: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    infoLabel: {
      fontFamily: fonts.bold,
    },
  });

export default SignStepPrivacyPolicy;
