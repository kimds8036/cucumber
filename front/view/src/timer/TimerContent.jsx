/**
 * 타이머 메인 화면 — 친구 바·모달 조립 (본문 로직은 useTimerDay / TimerLiveViews)
 */
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { createTimerStyles, getNormalize } from '../../../styles/timer';
import { api, getApiUserFacingMessage } from '../../../utils/api';
import { saveImageUriToGallery, alertGallerySaveFailure } from '../../../utils/saveImageToGallery';
import TimerDayContentSkeleton from './TimerDayContentSkeleton';
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
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { runAfterTabTransition } from '../../../utils/runAfterTabTransition';
import { useFriendStudyEvents } from '../../../hooks/useFriendStudyEvents';
import { useGuidePreview } from '../../../context/GuidePreviewContext';
import { getGuideTimerFriends } from '../../../src/screens/UserGuide/guidePreviewData';
import { appAlert } from '../../../utils/appAlert';
import {
  setTimerRuntimeState,
  TIMER_COUNTDOWN_TOTAL_SECONDS,
} from '../../../utils/timerRuntimeStore';
import { tdb } from './timerHelpers';
import { useTimerDay } from './useTimerDay';
import {
  LiveElapsedTicker,
  TimerLiveScrollInner,
  TimerLivePlannerCapture,
} from './TimerLiveViews';

export function TimerContent() {
  const { isGuidePreview } = useGuidePreview();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );
  const isFocused = useIsFocused();

  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokeTarget, setPokeTarget] = useState(null);
  const [pokeVisible, setPokeVisible] = useState(false);
  const [captureMounted, setCaptureMounted] = useState(false);

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
    const loadFriends = async () => {
      try {
        const res = await api.get('/api/friends/list');
        const list = res.data?.data ?? [];
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
          })),
        );
      } catch (error) {
        console.error('타이머 친구 목록 조회 실패:', error);
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
  }, [isGuidePreview]);

  const handleOpenAddFriend = useCallback(() => setShowAddFriend(true), []);
  const handleFriendPress = useCallback(
    (friend) => {
      const isActive = studyingFriends?.[friend.id] === true;
      setPokeTarget({ ...friend, isActive });
      setPokeVisible(true);
    },
    [studyingFriends],
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

  const handleSaveAsImage = async () => {
    setCaptureMounted(true);
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (!timer.capturePlannerRef.current?.capture) {
      setCaptureMounted(false);
      return;
    }
    try {
      const uri = await timer.capturePlannerRef.current.capture();
      await saveImageUriToGallery(uri);
      appAlert.alert('저장 완료', '갤러리에 저장되었어요.');
    } catch (e) {
      alertGallerySaveFailure(e);
    } finally {
      setCaptureMounted(false);
    }
  };

  if (!timer.initialLoadDone) {
    return (
      <ScrollView
        style={[styles.scroll, tdb('#FF3B30')]}
        contentContainerStyle={[styles.scrollContent, tdb('#FF9500')]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.friendStoryRow, tdb('#FFCC00')]}>
          <View style={[styles.friendStoryScroll, tdb('#34C759')]}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={`timer-friend-skel-${idx}`}
                style={styles.friendStoryCircleWrap}
              >
                <Skeleton
                  width={normalize(56)}
                  height={normalize(56)}
                  borderRadius={normalize(28)}
                />
                <Skeleton
                  width={normalize(44)}
                  height={normalize(11)}
                  borderRadius={normalize(6)}
                  style={styles.timerSkelFriendName}
                />
              </View>
            ))}
          </View>
        </View>

        <TimerDayContentSkeleton styles={styles} normalize={normalize} />
      </ScrollView>
    );
  }

  const showDayContentSkeleton = timer.isDayLoading;

  return (
    <>
      {isFocused ? (
        <LiveElapsedTicker
          isRunning={timer.isRunning}
          sessionStartedAtMs={timer.openSessionStartedAtMs}
          resyncAt={timer.liveElapsedResyncAt}
          isActive={isFocused}
        >
          <>
            <ScrollView
              style={[styles.scroll, tdb('#FF3B30')]}
              contentContainerStyle={[styles.scrollContent, tdb('#FF9500')]}
              showsVerticalScrollIndicator={false}
            >
              <FriendStoryBar
                friends={friends}
                studyingFriends={studyingFriends}
                normalize={normalize}
                styles={styles}
                onFriendPress={handleFriendPress}
                onAddFriendPress={handleOpenAddFriend}
              />
              {showDayContentSkeleton ? (
                <TimerDayContentSkeleton styles={styles} normalize={normalize} />
              ) : (
                <TimerLiveScrollInner
                  styles={styles}
                  normalize={normalize}
                  isViewingToday={timer.isViewingToday}
                  totalElapsedMs={timer.totalElapsedMs}
                  displayTotalElapsedMs={timer.displayTotalElapsedMs}
                  displaySessions={timer.displaySessionsForTimetable}
                  displaySubjects={timer.effectiveDisplaySubjects}
                  displayTasks={timer.displayTasks}
                  isRunning={timer.isRunning}
                  activeSubjectId={timer.activeSubjectId}
                  selectedDayKey={timer.selectedDayKey}
                  goPrevDay={timer.goPrevDay}
                  goNextDay={timer.goNextDay}
                  canGoNextDay={timer.canGoNextDay}
                  setShowCalendar={timer.setShowCalendar}
                  handleSaveAsImage={handleSaveAsImage}
                  toggleTimer={timer.toggleTimer}
                  pauseTimer={timer.pauseTimer}
                  startForSubject={timer.startForSubject}
                  collapsedSubjects={timer.collapsedSubjects}
                  toggleSubjectCollapsed={timer.toggleSubjectCollapsed}
                  openAddTaskForSubject={timer.openAddTaskForSubject}
                  setShowAddSubject={timer.setShowAddSubject}
                  setTaskStatus={timer.setTaskStatus}
                  deleteSubject={timer.deleteSubject}
                  deleteTask={timer.deleteTask}
                />
              )}
            </ScrollView>
            {captureMounted ? (
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
              />
            ) : null}
          </>
        </LiveElapsedTicker>
      ) : null}

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
                    try {
                      const res = await api.post('/api/friends/requests', {
                        username,
                      });
                      const data = res.data?.data || {};
                      const targetName =
                        data.targetName ||
                        data.targetUsername ||
                        `@${username}`;
                      pushTimerToast(targetName, '친구 요청을 보냈어요');
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
                    }
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
