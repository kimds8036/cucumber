import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

export const TIMER_RUNNING_NOTIFICATION_IDENTIFIER = 'focux-timer-running';
let timerNotificationOp = Promise.resolve();

function logTimerNotification(event, payload = {}) {
  if (!__DEV__) return;
  console.log(`[TimerNotification][${event}]`, {
    at: new Date().toISOString(),
    appState: AppState.currentState,
    ...payload,
  });
}

export function configureTimerNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: AppState.currentState !== 'active',
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: AppState.currentState !== 'active',
      shouldShowList: AppState.currentState !== 'active',
    }),
  });
}

async function hasExistingTimerNotification() {
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    Notifications.getPresentedNotificationsAsync(),
  ]);
  const matchByData = (n) =>
    n?.content?.data?.identifier === TIMER_RUNNING_NOTIFICATION_IDENTIFIER;
  const exists = scheduled.some(matchByData) || presented.some(matchByData);
  logTimerNotification('exists_check', {
    exists,
    scheduledCount: scheduled.length,
    presentedCount: presented.length,
  });
  return exists;
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
        logTimerNotification('show_skip_active');
        return;
      }
      if (await hasExistingTimerNotification()) {
        logTimerNotification('show_skip_existing');
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
      logTimerNotification('show_scheduled');
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
          n?.content?.data?.identifier === TIMER_RUNNING_NOTIFICATION_IDENTIFIER,
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
      logTimerNotification('cancel_done', {
        cancelledScheduled: targets.length,
        dismissedPresented: presentedTargets.length,
      });
    } catch (error) {
      console.warn('[TimerNotification] cancel failed:', error?.message ?? error);
    }
  });
  return timerNotificationOp;
}

