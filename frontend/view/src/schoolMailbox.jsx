import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Entypo } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailStyles } from '../../styles/SchoolMail.style';

/** NEW 뱃지: 수신 시각 기준 24시간 이내만 (API 연동 시 서버 createdAt 사용) */
const NEW_BADGE_MS = 24 * 60 * 60 * 1000;

function isSchoolMailNew(mail) {
  let ms = mail.createdAtMs;
  if (ms == null && mail.createdAt) {
    const parsed = new Date(mail.createdAt).getTime();
    if (!Number.isNaN(parsed)) ms = parsed;
  }
  if (ms == null || Number.isNaN(ms)) return false;
  return Date.now() - ms < NEW_BADGE_MS;
}

const MOCK_SCHOOL_MAILS = [
  {
    id: 1,
    preview: '2학기 중간고사가 다음 주부터 시작됩니다. 시험 범위와 일정을 확인해주세요.',
    content:
      '2학기 중간고사가 다음 주부터 시작됩니다.\n\n시험 범위와 일정은 학교 홈페이지 공지를 확인해 주세요. 모두 좋은 결과 있기를 바랍니다.',
    fromLabel: '익명',
    time: '3시간 전',
    likes: 12,
    comments: 3,
    createdAtMs: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: 2,
    preview: '다음 달 체육대회 참가 신청을 받습니다. 참여를 원하시는 분들은...',
    content: '다음 달 체육대회 참가 신청을 받습니다. 참여를 원하시는 분들은 담임선생님께 말씀해 주세요.',
    fromLabel: '익명',
    time: '1일 전',
    likes: 5,
    comments: 1,
    createdAtMs: Date.now() - 25 * 60 * 60 * 1000,
  },
  {
    id: 3,
    preview: '이번 주 금요일 급식 메뉴가 변경되었습니다.',
    content: '이번 주 금요일 급식 메뉴가 변경되었습니다. 자세한 사항은 급식실 공지를 참고해 주세요.',
    fromLabel: '익명',
    time: '2일 전',
    likes: 0,
    comments: 0,
    createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 4,
    preview: '2학기 중간고사가 다음 주부터 시작됩니다. 시험 범위와 일정을 확인해주세요.',
    content: '중간고사 일정 안내드립니다. 각 과목 범위는 담당 교과에서 안내 예정입니다.',
    fromLabel: '익명',
    time: '3일 전',
    likes: 3,
    comments: 2,
    createdAtMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

const SchoolMailboxScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolMailStyles(width, normalize), [width, normalize]);

  // 학교 이름: route.params.schoolName 으로 넘기면 표시 (예: navigate('SchoolMailbox', { schoolName: '진관고등학교' }))
  // 추후 전역 상태(로그인 사용자 소속 학교) 또는 API로 교체 가능
  const schoolName = route?.params?.schoolName ?? 'OO고등학교';

  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [floatingMenuMail, setFloatingMenuMail] = useState(null);
  const menuButtonRefs = useRef({});

  const defaultMenuItems = useMemo(
    () => [
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
    ],
    []
  );

  const openFloatingMenu = (mail, ref) => {
    ref?.measureInWindow((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuMail(mail);
      setFloatingMenuVisible(true);
    });
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
    setFloatingMenuMail(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="학교 우편함" onBack={() => navigation?.goBack()} />

      <View style={styles.container}>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          {MOCK_SCHOOL_MAILS.map((mail) => (
            <TouchableOpacity
              key={mail.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation?.navigate('SchoolMailDetail', {
                  mail,
                  schoolName,
                })
              }
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={normalize(22)}
                    color={colors.primary}
                    style={styles.cardEnvelope}
                  />
                </View>
                {isSchoolMailNew(mail) && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardPreview} numberOfLines={2}>
                {mail.preview}
              </Text>

              <View style={styles.cardFooterRow}>
                <Text style={styles.cardTime}>{mail.time}</Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <FontAwesome name="heart-o" size={normalize(14)} color={colors.alert} />
                    <Text style={styles.statText}>{mail.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                    <Text style={styles.statText}>{mail.comments}</Text>
                  </View>
                  <View
                    ref={(r) => {
                      if (r) menuButtonRefs.current[mail.id] = r;
                    }}
                    collapsable={false}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        openFloatingMenu(mail, menuButtonRefs.current[mail.id]);
                      }}
                      hitSlop={{
                        top: normalize(8),
                        bottom: normalize(8),
                        left: normalize(8),
                        right: normalize(8),
                      }}
                    >
                      <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 학교 우편 보내기 플로팅 버튼 (Message.jsx와 동일 스타일) */}
        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.8}
          onPress={() =>
            navigation?.navigate('SendSchoolMail', {
              schoolName,
              // TODO: API 연동 시 schoolId, schoolAddress 등으로 교체
              schoolAddress: '서울특별시 OO구 OO로 00 (임시)',
            })
          }
        >
          <Feather
            name="send"
            size={normalize(30)}
            top={normalize(2)}
            right={normalize(1)}
            color={colors.background}
          />
        </TouchableOpacity>
      </View>

      {/* 플로팅 메뉴 (boardAll과 유사) */}
      <Modal
        visible={floatingMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFloatingMenu}
      >
        <TouchableWithoutFeedback onPress={closeFloatingMenu}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: normalize(12),
                  minWidth: width * 0.45,
                  maxWidth: width * 0.7,
                  paddingVertical: normalize(4),
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 5,
                  ...(floatingMenuAnchor
                    ? {
                        position: 'absolute',
                        right: width - floatingMenuAnchor.x,
                        top: floatingMenuAnchor.y,
                      }
                    : {}),
                }}
              >
                {defaultMenuItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: normalize(10),
                        paddingHorizontal: normalize(14),
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (item.onPress) item.onPress(floatingMenuMail);
                        closeFloatingMenu();
                      }}
                    >
                      <Text
                        style={{
                          fontSize: normalize(13),
                          fontFamily: fonts.regular,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Ionicons
                        name={item.iconName}
                        size={normalize(17)}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {index < defaultMenuItems.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.textLight10,
                          marginHorizontal: normalize(8),
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default SchoolMailboxScreen;

