/**
 * 타이머 메인 화면 — 친구 바·모달 조립 (본문 로직은 useTimerDay / TimerLiveViews)
 */
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  ScrollView,
  PixelRatio,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { createTimerStyles, getNormalize } from '../../../styles/timer';
import { colors } from '../../../styles/colors';
import MainHeader from '../../frame/mainHeader';
import { getMainTabTitle } from '../../../context/MainShellContext';
import { api, getApiUserFacingMessage } from '../../../utils/api';
import { saveImageUriToGallery, alertGallerySaveFailure } from '../../../utils/saveImageToGallery';
import TimerDayContentSkeleton from './TimerDayContentSkeleton';
import TimerPhaseEndPopup from './TimerPhaseEndPopup';
import Skeleton from '../../../components/common/Skeleton';
import { AddSubjectModal, AddTaskModal, CalendarModal } from '../timerModals';
import {
  INITIAL_FRIENDS,
  FRIEND_ICON_COLORS,
  FriendStoryBar,
  FriendPokeController,
  AddFriendModal,
} from '../../../components/timerFriendModals';
import { useToast } from '../../../context/ToastContext';
import { useFriendSocketEvents } from '../../../hooks/useFriendSocketEvents';
import { useFriend } from '../../../context/FriendContext';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { runAfterTabTransition } from '../../../utils/runAfterTabTransition';
import { useFriendStudyEvents } from '../../../hooks/useFriendStudyEvents';
import { useGuidePreview } from '../../../context/GuidePreviewContext';
import { useMainTabBarInset } from '../../../context/MainTabBarInsetContext';
import { getGuideTimerFriends } from '../../../src/screens/UserGuide/guidePreviewData';
import { appAlert } from '../../../utils/appAlert';
import {
  setTimerRuntimeState,
  TIMER_COUNTDOWN_TOTAL_SECONDS,
} from '../../../utils/timerRuntimeStore';
import { preloadStudyRoomAssets } from '../../../utils/preloadStudyRoomAssets';
import { tdb } from './timerHelpers';
import TopAdBanner from '../../../components/ads/TopAdBanner';
import { pickActiveNoticeForBanner, pickBanner } from '../../../constants/bannerAssets';
import { useTimerDay } from './useTimerDay';
import {
  LiveElapsedTicker,
  TimerLiveScrollInner,
  TimerLivePlannerCapture,
} from './TimerLiveViews';
import { TimerPlannerTabBar } from './TimerPlannerTabs';
import TimerDayRecordSheet from './TimerDayRecordSheet';
import { useTimerDayRecord } from './useTimerDayRecord';
import { useTimerWeekly } from './useTimerWeekly';
import { useStudyStreak } from './useStudyStreak';
import {
  preloadTimerCaptureWatermark,
  waitForTimerCapturePaint,
} from './timerCaptureWatermark';

export function TimerContent() {
  const navigation = useNavigation();
  const { isGuidePreview } = useGuidePreview();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const tabBarInset = useMainTabBarInset();
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );
  const isFocused = useIsFocused();
  const [timerBanner] = useState(() => pickBanner('timer'));
  const [noticeBanner, setNoticeBanner] = useState(null);
  const [timerBannerReady, setTimerBannerReady] = useState(isGuidePreview);

  useFocusEffect(
    useCallback(() => {
      if (isGuidePreview) {
        setNoticeBanner(null);
        setTimerBannerReady(true);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        try {
          const res = await api.get('/api/announcements', {
            params: { limit: 20 },
          });
          const items = Array.isArray(res.data?.data?.items)
            ? res.data.data.items
            : [];
          // API 광고가 연결되면 hasApiAd를 true로 넘겨 공지 배너를 3일로 줄인다.
          const active = pickActiveNoticeForBanner(items, { hasApiAd: false });
          if (!cancelled) setNoticeBanner(active);
        } catch (error) {
          console.warn('[Timer] 공지 배너 조회 실패', error?.message || error);
          if (!cancelled) setNoticeBanner(null);
        } finally {
          if (!cancelled) setTimerBannerReady(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isGuidePreview]),
  );

  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [suggestions, setSuggestions] = useState([]);
  const [friendsBarLoading, setFriendsBarLoading] = useState(!isGuidePreview);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokeTarget, setPokeTarget] = useState(null);
  const [pokeVisible, setPokeVisible] = useState(false);
  const [plannerTab, setPlannerTab] = useState('todo');
  const scrollY = useSharedValue(0);
  const origY = useSharedValue(0);
  const onPlannerScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const onCardSlotLayout = useCallback((event) => {
    const y = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.y);
    if (y < 0 || origY.value === y) return;
    origY.value = y;
  }, [origY]);
  const chromeStuck = useDerivedValue(() => {
    const y = origY.value;
    if (y <= 0) return false;
    return scrollY.value >= y;
  });
  const inFlowChromeStyle = useAnimatedStyle(() => ({
    opacity: chromeStuck.value ? 0 : 1,
    pointerEvents: chromeStuck.value ? 'none' : 'auto',
  }));
  const overlayChromeStyle = useAnimatedStyle(() => ({
    opacity: chromeStuck.value ? 1 : 0,
    pointerEvents: chromeStuck.value ? 'auto' : 'none',
  }));
  const inFlowChromeProps = useAnimatedProps(() => ({
    pointerEvents: chromeStuck.value ? 'none' : 'auto',
  }));
  const overlayChromeProps = useAnimatedProps(() => ({
    pointerEvents: chromeStuck.value ? 'auto' : 'none',
  }));
  /** 공부 잔디에서 연 지난 날짜 기록 시트 — { dayKey, seconds } | null */
  const [dayRecord, setDayRecord] = useState(null);
  const captureWatermarkReadyRef = useRef(false);
  const captureReadyWaitersRef = useRef([]);

  const notifyCaptureWatermarkReady = useCallback(() => {
    captureWatermarkReadyRef.current = true;
    captureReadyWaitersRef.current.forEach((resolve) => resolve());
    captureReadyWaitersRef.current = [];
  }, []);

  const waitForCaptureWatermarkReady = useCallback(async () => {
    if (captureWatermarkReadyRef.current) return;
    await new Promise((resolve) => {
      captureReadyWaitersRef.current.push(resolve);
      setTimeout(resolve, 800);
    });
  }, []);

  const { showToast, setIsTimerScreenActive } = useToast();
  const pushTimerToast = useCallback((senderName, body) => {
    const s = String(senderName || '').trim();
    const b = String(body || '').trim();
    if (!b) return;
    const hasSender = s.length > 0;
    showToast({
      message: hasSender ? `${s}: ${b}` : b,
      senderName: hasSender ? s : null,
      body: hasSender ? b : null,
      showProgress: true,
    });
  }, [showToast]);

  const { studyingFriends, refreshStudyingFriends } = useFriend();
  const { emitTimerStatus } = useFriendSocketEvents({});

  useFriendStudyEvents({
    onFriendStudyFinished: () => {},
    onPoke: (payload) => {
      const senderName = String(
        payload?.fromNickname ??
          payload?.fromName ??
          payload?.senderName ??
          payload?.nickname ??
          payload?.name ??
          '',
      ).trim();
      pushTimerToast(
        '',
        senderName ? `${senderName} 님이 쿡 찔렀어요` : '누군가 쿡 찔렀어요',
      );
    },
    onMyStudyFinishedSummary: ({ toastText, watchers, createdAt, type }) => {
      const watcherList = Array.isArray(watchers) ? watchers : [];
      if (watcherList.length === 0) return;
      const summaryBody = String(toastText || '').trim();
      if (!summaryBody) return;
      showToast({
        message: summaryBody,
        senderName: null,
        body: null,
        relatedType: 'friend_study_finished_summary',
        relatedId: createdAt ? String(createdAt) : null,
        type: type || 'study_finished_summary',
        category: 'system',
        watchers: watcherList,
        showProgress: true,
      });
    },
  });

  useEffect(() => {
    if (!isFocused || isGuidePreview) return undefined;
    let mounted = true;
    setFriendsBarLoading(true);
    const loadFriends = async () => {
      try {
        const [friendsRes, suggestRes] = await Promise.all([
          api.get('/api/friends/list'),
          api.get('/api/friends/timer-suggestions').catch((err) => {
            console.warn('[Timer] 친구 추천 조회 실패', err?.message || err);
            return { data: { data: [] } };
          }),
        ]);
        const list = friendsRes.data?.data ?? [];
        const suggestList = suggestRes.data?.data ?? [];
        if (!mounted) return;
        setFriends(
          list.map((f, index) => ({
            id: f.userId,
            name: f.name || f.username || '친구',
            username: f.username,
            colorId:
              f.colorId ??
              f.profileColorId ??
              f.profile_color_id ??
              f.profileColor?.id,
            colorIndex: index % FRIEND_ICON_COLORS.length,
            isSuggestion: false,
            avatarUrl: f.avatarUrl || f.avatar_url || null,
          })),
        );
        setSuggestions(
          (Array.isArray(suggestList) ? suggestList : []).map((s, index) => {
            const username = s.username || '';
            const displayId = username.startsWith('@')
              ? username
              : username
                ? `@${username}`
                : '학생';
            return {
              id: s.userId,
              // 추천은 아이디만 표시 (실명 비노출)
              name: displayId,
              username: displayId === '학생' ? '' : displayId,
              colorId:
                s.colorId ??
                s.profileColorId ??
                s.profileColor?.id,
              colorIndex: index % FRIEND_ICON_COLORS.length,
              isSuggestion: true,
              avatarUrl: s.avatarUrl || s.avatar_url || null,
            };
          }),
        );
      } catch (error) {
        console.error('타이머 친구 목록 조회 실패:', error);
      } finally {
        if (mounted) setFriendsBarLoading(false);
      }
    };
    const cancel = runAfterTabTransition(loadFriends);
    return () => {
      mounted = false;
      cancel();
    };
  }, [isFocused, isGuidePreview]);

  useEffect(() => {
    if (!isGuidePreview) return;
    setFriends(getGuideTimerFriends());
    setSuggestions([]);
    setFriendsBarLoading(false);
  }, [isGuidePreview]);

  const storyFriends = useMemo(
    () => [...friends, ...suggestions],
    [friends, suggestions],
  );

  const handleOpenAddFriend = useCallback(() => setShowAddFriend(true), []);

  const sendFriendRequestByUsername = useCallback(
    async (rawUsername) => {
      const username = String(rawUsername || '')
        .trim()
        .replace(/^@/, '');
      if (!username) return false;
      try {
        await api.post('/api/friends/requests', { username });
        // 추천·요청 단계에서는 실명 미노출 — 문구만 표시
        pushTimerToast('', '친구 요청을 보냈어요');
        return true;
      } catch (error) {
        console.error('[Timer][FriendRequest] API 실패', {
          username,
          status: error.response?.status,
          message: error.response?.data?.message,
        });
        Alert.alert(
          '친구 요청 실패',
          getApiUserFacingMessage(
            error,
            '친구 요청 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
          ),
        );
        return false;
      }
    },
    [pushTimerToast],
  );

  const handleFriendPress = useCallback(
    (friend) => {
      if (friend?.isSuggestion) {
        const label = friend.username || friend.name || '이 사용자';
        Alert.alert(
          '친구 추가',
          `${label} 님을 친구 추가하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '추가',
              onPress: async () => {
                const ok = await sendFriendRequestByUsername(friend.username);
                if (ok) {
                  setSuggestions((prev) =>
                    prev.filter((s) => String(s.id) !== String(friend.id)),
                  );
                }
              },
            },
          ],
          {
            note: '상대가 수락하면 친구 목록에 표시됩니다.',
          },
        );
        return;
      }
      const isActive = studyingFriends?.[friend.id] === true;
      setPokeTarget({ ...friend, isActive });
      setPokeVisible(true);
    },
    [sendFriendRequestByUsername, studyingFriends],
  );

  const timer = useTimerDay({
    isGuidePreview,
    isFocused,
    emitTimerStatus,
    pushTimerToast,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (isGuidePreview) return undefined;

      const cancelEnter = runAfterTabTransition(() => {
        setIsTimerScreenActive?.(true);
        preloadStudyRoomAssets();
        if (timer.isRunningRef.current) {
          timer.bumpLiveElapsedResync();
          setTimerRuntimeState({
            countdownBaseTimestamp: null,
            countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
          });
        }
        refreshStudyingFriends?.();
      });

      return () => {
        cancelEnter();
        setIsTimerScreenActive?.(false);
        if (timer.isRunningRef.current) {
          setTimerRuntimeState({
            countdownBaseTimestamp: Date.now(),
            countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
          });
        }
      };
    }, [
      refreshStudyingFriends,
      setIsTimerScreenActive,
      isGuidePreview,
      timer.bumpLiveElapsedResync,
      timer.isRunningRef,
    ]),
  );

  const dayRecordData = useTimerDayRecord(dayRecord?.dayKey ?? null);
  const weekly = useTimerWeekly();
  const grassRefreshSec = timer.isRunning
    ? null
    : Math.floor((timer.totalElapsedMs || 0) / 1000);
  const streakDays = useStudyStreak(grassRefreshSec);
  const dayRecordCaptureRef = useRef(null);

  const captureToGallery = async (captureRef) => {
    if (!captureRef.current?.capture) {
      return;
    }
    try {
      await preloadTimerCaptureWatermark();
      await waitForCaptureWatermarkReady();
      await waitForTimerCapturePaint();
      const uri = await captureRef.current.capture();
      await saveImageUriToGallery(uri);
      appAlert.alert('저장 완료', '갤러리에 저장되었어요.');
    } catch (e) {
      alertGallerySaveFailure(e);
    }
  };

  const handleSaveAsImage = () => captureToGallery(timer.capturePlannerRef);
  const handleSaveDayRecord = () => captureToGallery(dayRecordCaptureRef);

  const timerGutter = width * 0.04;
  const scrollingHeader = (
    <MainHeader
      headerTitle={getMainTabTitle('timer')}
      navigation={navigation}
    />
  );
  const friendStoryStickyStyle = {
    backgroundColor: colors.white,
    paddingTop: normalize(8),
  };

  const timerBannerNode = !timer.initialLoadDone || !timerBannerReady ? (
    <View
      style={{
        height: normalize(80),
        marginBottom: normalize(10),
        backgroundColor: colors.white,
      }}
    />
  ) : (
    <TopAdBanner
      placement="timer"
      inset={false}
      picked={noticeBanner ?? timerBanner}
      onPress={
        noticeBanner?.id
          ? () =>
              navigation.navigate('AnnouncementDetail', {
                announcementId: noticeBanner.id,
                title: noticeBanner.title,
              })
          : undefined
      }
    />
  );

  if (!timer.initialLoadDone) {
    return (
      <ScrollView
        style={[styles.scroll, tdb('#FF3B30')]}
        contentContainerStyle={{ paddingBottom: normalize(24) + tabBarInset }}
        scrollIndicatorInsets={{ bottom: tabBarInset }}
        showsVerticalScrollIndicator={false}
      >
        {scrollingHeader}
        <View
          style={[styles.friendStoryRow, friendStoryStickyStyle, tdb('#FFCC00')]}
          collapsable={false}
        >
          <View style={{ width: '100%' }}>
            <Skeleton
              width="100%"
              height={normalize(74)}
              borderRadius={normalize(16)}
            />
          </View>
        </View>
        <View style={{ paddingHorizontal: timerGutter }}>
          {timerBannerNode}
          <TimerDayContentSkeleton normalize={normalize} />
        </View>
      </ScrollView>
    );
  }

  const showDayContentSkeleton = timer.isDayLoading && plannerTab !== 'grass';

  const openDayRecord = (dayKey, seconds) => {
    setDayRecord({ dayKey, seconds });
  };

  const closeDayRecord = () => {
    setDayRecord(null);
  };

  const liveScrollProps = {
    styles,
    normalize,
    isViewingToday: timer.isViewingToday,
    totalElapsedMs: timer.totalElapsedMs,
    displayTotalElapsedMs: timer.displayTotalElapsedMs,
    displaySessions: timer.displaySessionsForTimetable,
    displaySubjects: timer.effectiveDisplaySubjects,
    displayTasks: timer.displayTasks,
    isRunning: timer.isRunning,
    activeSubjectId: timer.activeSubjectId,
    selectedDayKey: timer.selectedDayKey,
    goPrevDay: timer.goPrevDay,
    goNextDay: timer.goNextDay,
    canGoNextDay: timer.canGoNextDay,
    setShowCalendar: timer.setShowCalendar,
    handleSaveAsImage,
    onOpenStudyRoom: () => {
      preloadStudyRoomAssets();
      navigation.navigate('TimerAniLab');
    },
    toggleTimer: timer.toggleTimer,
    onPomodoroMode: timer.setPomodoroMode,
    pauseTimer: timer.pauseTimer,
    startForSubject: timer.startForSubject,
    pomoClockOn: timer.pomoClockOn,
    pomoSkip: timer.pomoSkip,
    pomoResetClock: timer.pomoResetClock,
    collapsedSubjects: timer.collapsedSubjects,
    toggleSubjectCollapsed: timer.toggleSubjectCollapsed,
    openAddTaskForSubject: timer.openAddTaskForSubject,
    setShowAddSubject: timer.setShowAddSubject,
    setTaskStatus: timer.setTaskStatus,
    deleteSubject: timer.deleteSubject,
    deleteTask: timer.deleteTask,
    onOpenDayRecord: openDayRecord,
    weekly,
    streakDays,
    grassRefreshSec,
    onOpenSettings: () => navigation.navigate('TimerSettings'),
  };

  const renderPlannerChrome = (registerGuideTarget) => (
    <View style={{ backgroundColor: colors.white }} collapsable={false}>
      <View style={{ paddingHorizontal: timerGutter }}>
        <TimerLiveScrollInner
          segment="card"
          {...liveScrollProps}
          registerGuideTarget={registerGuideTarget}
        />
      </View>
      <View style={{ paddingHorizontal: timerGutter }}>
        <TimerPlannerTabBar
          value={plannerTab}
          onChange={setPlannerTab}
          styles={styles}
        />
      </View>
    </View>
  );

  return (
    <>
      <LiveElapsedTicker
          isRunning={timer.isRunning}
          sessionStartedAtMs={timer.openSessionStartedAtMs}
          resyncAt={timer.liveElapsedResyncAt}
          isActive={isFocused}
        >
          <>
            <View style={styles.scroll}>
            <KeyboardAwareScrollView
              style={[styles.scroll, tdb('#FF3B30')]}
              contentContainerStyle={{ paddingBottom: normalize(24) + tabBarInset }}
              scrollIndicatorInsets={{ bottom: tabBarInset }}
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bottomOffset={normalize(20)}
              mode="layout"
              scrollEventThrottle={16}
              onScroll={onPlannerScroll}
            >
              {scrollingHeader}
              <View
                style={friendStoryStickyStyle}
                collapsable={false}
              >
                <FriendStoryBar
                  friends={storyFriends}
                  studyingFriends={studyingFriends}
                  normalize={normalize}
                  styles={styles}
                  loading={friendsBarLoading}
                  onFriendPress={handleFriendPress}
                  onAddFriendPress={handleOpenAddFriend}
                />
              </View>
              <View
                collapsable={false}
                style={{
                  paddingHorizontal: timerGutter,
                }}
              >
                {timerBannerNode}
              </View>
              {showDayContentSkeleton ? (
                <View style={{ paddingHorizontal: timerGutter }}>
                  <TimerDayContentSkeleton normalize={normalize} />
                </View>
              ) : (
                <Animated.View
                  collapsable={false}
                  onLayout={onCardSlotLayout}
                  style={inFlowChromeStyle}
                  animatedProps={inFlowChromeProps}
                >
                  {renderPlannerChrome(true)}
                </Animated.View>
              )}
              {showDayContentSkeleton ? null : (
                <View style={{ paddingHorizontal: timerGutter }}>
                  <TimerLiveScrollInner
                    segment="body"
                    plannerTab={plannerTab}
                    {...liveScrollProps}
                  />
                </View>
              )}
            </KeyboardAwareScrollView>
            {showDayContentSkeleton ? null : (
              <Animated.View
                collapsable={false}
                animatedProps={overlayChromeProps}
                style={[
                  overlayChromeStyle,
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: colors.white,
                    zIndex: 3,
                  },
                ]}
              >
                {renderPlannerChrome(false)}
              </Animated.View>
            )}
            </View>
            {timer.initialLoadDone ? (
              <TimerLivePlannerCapture
                capturePlannerRef={timer.capturePlannerRef}
                styles={styles}
                normalize={normalize}
                isViewingToday={timer.isViewingToday}
                isRunning={timer.isRunning}
                activeSubjectId={timer.activeSubjectId}
                totalElapsedMs={timer.totalElapsedMs}
                displayTotalElapsedMs={timer.displayTotalElapsedMs}
                displaySessions={timer.displaySessionsForTimetable}
                displaySubjects={timer.effectiveDisplaySubjects}
                displayTasks={timer.displayTasks}
                selectedDayKey={timer.selectedDayKey}
                onWatermarkLoad={notifyCaptureWatermarkReady}
              />
            ) : null}
            {dayRecord && !dayRecordData.loading ? (
              <TimerLivePlannerCapture
                capturePlannerRef={dayRecordCaptureRef}
                styles={styles}
                normalize={normalize}
                isViewingToday={false}
                isRunning={false}
                activeSubjectId={null}
                totalElapsedMs={0}
                displayTotalElapsedMs={dayRecordData.totalElapsedMs}
                displaySessions={dayRecordData.displaySessions}
                displaySubjects={dayRecordData.displaySubjects}
                displayTasks={dayRecordData.displayTasks}
                selectedDayKey={dayRecord.dayKey}
                onWatermarkLoad={notifyCaptureWatermarkReady}
              />
            ) : null}
          </>
        </LiveElapsedTicker>

      <TimerPhaseEndPopup
        notice={isFocused ? timer.phaseEndNotice : null}
        onClose={timer.dismissPhaseEndNotice}
        styles={styles}
        normalize={normalize}
      />
      <AddSubjectModal
        visible={timer.showAddSubject}
        onClose={() => timer.setShowAddSubject(false)}
        onAdd={timer.addSubject}
      />
      <AddTaskModal
        visible={timer.showAddTask}
        onClose={() => {
          timer.setShowAddTask(false);
          timer.setAddTaskSubjectId(null);
        }}
        onAdd={timer.addTask}
        subjects={timer.subjects}
        initialSubjectId={timer.addTaskSubjectId}
      />
      <CalendarModal
        visible={timer.showCalendar}
        onClose={() => timer.setShowCalendar(false)}
        currentDayKey={timer.selectedDayKey}
        onSelectDay={timer.setSelectedDayKey}
      />
      <TimerDayRecordSheet
        dayKey={dayRecord?.dayKey ?? null}
        seconds={dayRecord?.seconds ?? 0}
        loading={dayRecordData.loading}
        onClose={closeDayRecord}
        onSave={handleSaveDayRecord}
        styles={styles}
        normalize={normalize}
        displaySessions={dayRecordData.displaySessions}
        displaySubjects={dayRecordData.displaySubjects}
        displayTasks={dayRecordData.displayTasks}
        collapsedSubjects={dayRecordData.collapsedSubjects}
        toggleSubjectCollapsed={dayRecordData.toggleSubjectCollapsed}
      />

      <FriendPokeController
        visible={pokeVisible}
        friend={pokeTarget}
        onClose={() => {
          setPokeVisible(false);
          setPokeTarget(null);
        }}
      />
      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAdd={async (raw) => {
          const trimmed = raw.trim();
          const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
          if (!username) return;
          setShowAddFriend(false);
          requestAnimationFrame(() => {
            Alert.alert(
              '친구 요청',
              `@${username} 님에게 친구 요청을 보내시겠어요?`,
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '보내기',
                  onPress: async () => {
                    await sendFriendRequestByUsername(username);
                  },
                },
              ],
            );
          });
        }}
      />
    </>
  );
}

export default React.memo(TimerContent);
