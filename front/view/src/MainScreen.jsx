import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  ToastAndroid,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import {
  MainShellProvider,
  useMainShell,
} from '../../context/MainShellContext';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import Skeleton from '../../components/common/Skeleton';
import { trackScreenView } from '../../utils/analytics';
import { MAIN_TAB_TO_ANALYTICS_SCREEN } from '../../constants/analyticsScreens';
import { MainTabNavigatorContainer } from './MainTabNavigator';
import StudentIdResubmit from './signup/StudentIdResubmit';
import SignupPrepMaterialsModal from './signup/SignupPrepMaterialsModal';
import { useAuth } from '../../context/AuthContext';

const MAIN_TABS = new Set(['board', 'message', 'school', 'timer', 'mypage']);

function hasDeepLinkTab(route) {
  const tab = route?.params?.screen ?? route?.params?.initialTab;
  return MAIN_TABS.has(tab);
}

/** MainShell 인증 요청 → 준비물 팝업(현재 화면) → 학생인증 화면 */
function StudentVerifyRequestBridge({ children }) {
  const {
    studentVerifyRequest,
    clearStudentVerificationRequest,
    endStudentVerificationUi,
  } = useMainShell();
  const { studentVerificationStatus } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [prepMode, setPrepMode] = useState(null);
  const [verifyMode, setVerifyMode] = useState(null);
  /** 준비물 확인 후 학생증 화면으로 넘길지 (페이드 완료 후) */
  const prepConfirmOpenRef = useRef(false);
  const pendingVerifyModeRef = useRef(null);

  useEffect(() => {
    if (!studentVerifyRequest) return;
    const status =
      studentVerifyRequest.statusHint || studentVerificationStatus;
    const mode =
      status === 'REJECTED'
        ? 'rejected'
        : status === 'APPROVED'
          ? 'reverification'
          : 'verify';
    prepConfirmOpenRef.current = false;
    pendingVerifyModeRef.current = null;
    setPrepMode(mode);
    clearStudentVerificationRequest();
  }, [
    studentVerifyRequest,
    studentVerificationStatus,
    clearStudentVerificationRequest,
  ]);

  const closeVerifyFlow = () => {
    prepConfirmOpenRef.current = false;
    pendingVerifyModeRef.current = null;
    setVerifyMode(null);
    setPrepMode(null);
    endStudentVerificationUi();
  };

  return (
    <>
      {verifyMode ? (
        <StudentIdResubmit
          mode={verifyMode}
          navigation={{
            goBack: closeVerifyFlow,
          }}
        />
      ) : (
        children
      )}
      <SignupPrepMaterialsModal
        visible={Boolean(prepMode)}
        variant="verify"
        normalize={normalize}
        onConfirm={() => {
          // App.js와 동일: 팝업 페이드가 끝난 뒤 화면 전환 (iOS Modal 중첩 방지)
          pendingVerifyModeRef.current = prepMode;
          prepConfirmOpenRef.current = true;
          setPrepMode(null);
        }}
        onCancel={() => {
          prepConfirmOpenRef.current = false;
          pendingVerifyModeRef.current = null;
          setPrepMode(null);
        }}
        onDismissed={() => {
          if (prepConfirmOpenRef.current && pendingVerifyModeRef.current) {
            const mode = pendingVerifyModeRef.current;
            prepConfirmOpenRef.current = false;
            pendingVerifyModeRef.current = null;
            setVerifyMode(mode);
            return;
          }
          endStudentVerificationUi();
        }}
      />
    </>
  );
}

const MainScreen = ({ navigation, route }) => {
  const deepLinkReady = hasDeepLinkTab(route);
  const [activeTab, setActiveTab] = useState(
    deepLinkReady ? route.params.screen || route.params.initialTab : 'board',
  );
  // 위젯 딥링크가 있으면 탭을 즉시 마운트해 linking state가 board로 덮이지 않게 함
  const [screenReady, setScreenReady] = useState(deepLinkReady);
  const [lastBackPressedAt, setLastBackPressedAt] = useState(0);

  useEffect(() => {
    if (hasDeepLinkTab(route)) {
      setScreenReady(true);
      return undefined;
    }
    if (screenReady) return undefined;
    const timer = setTimeout(() => setScreenReady(true), 180);
    return () => clearTimeout(timer);
  }, [route?.params?.screen, route?.params?.initialTab, screenReady, route]);

  useEffect(() => {
    const screen = MAIN_TAB_TO_ANALYTICS_SCREEN[activeTab];
    if (screen) trackScreenView(screen);
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (now - lastBackPressedAt < 2000) {
          BackHandler.exitApp();
          return true;
        }
        setLastBackPressedAt(now);
        ToastAndroid.show(
          '뒤로가기를 한 번 더 누르면 종료됩니다.',
          ToastAndroid.SHORT,
        );
        return true;
      });
      return () => sub.remove();
    }, [lastBackPressedAt]),
  );

  return (
    <MainShellProvider
      navigation={navigation}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <StudentVerifyRequestBridge>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          edges={['top']}
        >
          <MainHeader />
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {screenReady ? (
              <MainTabNavigatorContainer
                stackNavigation={navigation}
                route={route}
                onActiveTabChange={setActiveTab}
              />
            ) : (
              <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {[0, 1, 2].map((idx) => (
                  <View
                    key={`main-skeleton-${idx}`}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.textLight10,
                      marginBottom: 12,
                    }}
                  >
                    <Skeleton
                      width="55%"
                      height={14}
                      borderRadius={7}
                      style={{ marginBottom: 10 }}
                    />
                    <Skeleton
                      width="100%"
                      height={12}
                      borderRadius={6}
                      style={{ marginBottom: 8 }}
                    />
                    <Skeleton width="85%" height={12} borderRadius={6} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </StudentVerifyRequestBridge>
    </MainShellProvider>
  );
};

export default MainScreen;
