import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

export const TIMER_RUNNING_NOTIFICATION_IDENTIFIER = 'focux-timer-running';
let timerNotificationOp = Promise.resolve();

export function configureTimerNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const kind = notification?.request?.content?.data?.kind;
      const isPhaseCue = kind === 'pomodoro-phase-cue';
      const inBackground = AppState.currentState !== 'active';
      // 앱을 보고 있을 때 배너를 띄우면 안드로이드가 채널 소리를 내지 않는다.
      // 배너 없이 shouldPlaySound 만 켜면 res/raw/music.mp3 를 바로 재생한다.
      const show = inBackground;
      return {
        shouldShowAlert: show,
        shouldPlaySound: isPhaseCue,
        shouldSetBadge: false,
        shouldShowBanner: show,
        shouldShowList: show,
      };
    },
  });
}

async function hasExistingTimerNotification() {
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    Notifications.getPresentedNotificationsAsync(),
  ]);
  const matchByData = (n) =>
    n?.content?.data?.identifier === TIMER_RUNNING_NOTIFICATION_IDENTIFIER;
  return scheduled.some(matchByData) || presented.some(matchByData);
}

export async function hasTimerRunningNotification() {
  try {
    return await hasExistingTimerNotification();
  } catch {
    return false;
  }
}

export async function showTimerRunningNotification() {
  timerNotificationOp = timerNotificationOp.then(async () => {
    try {
      if (AppState.currentState === 'active') {
        return;
      }
      if (await hasExistingTimerNotification()) {
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '타이머 실행 중',
          body: '공부 시간을 기록 중이에요. 탭하여 돌아가기',
          data: {
            targetScreen: 'Timer',
            identifier: TIMER_RUNNING_NOTIFICATION_IDENTIFIER,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('[TimerNotification] show failed:', error?.message ?? error);
    }
  });
  return timerNotificationOp;
}

export async function cancelTimerRunningNotification() {
  timerNotificationOp = timerNotificationOp.then(async () => {
    try {
      const [scheduled, presented] = await Promise.all([
        Notifications.getAllScheduledNotificationsAsync(),
        Notifications.getPresentedNotificationsAsync(),
      ]);
      const targets = scheduled.filter(
        (n) =>
          n?.content?.data?.identifier ===
          TIMER_RUNNING_NOTIFICATION_IDENTIFIER,
      );
      for (const n of targets) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
      const presentedTargets = presented.filter(
        (n) =>
          n?.request?.content?.data?.identifier ===
          TIMER_RUNNING_NOTIFICATION_IDENTIFIER,
      );
      for (const n of presentedTargets) {
        await Notifications.dismissNotificationAsync(n.request.identifier);
      }
    } catch (error) {
      console.warn(
        '[TimerNotification] cancel failed:',
        error?.message ?? error,
      );
    }
  });
  return timerNotificationOp;
}
