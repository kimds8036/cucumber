import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

export const TIMER_RUNNING_NOTIFICATION_IDENTIFIER = 'focux-timer-running';

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
  return scheduled.some(matchByData) || presented.some(matchByData);
}

export async function showTimerRunningNotification() {
  try {
    if (AppState.currentState === 'active') return;
    if (await hasExistingTimerNotification()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '타이머 실행 중',
        body: '공부 시간을 기록하고 있어요. 탭해서 돌아오기',
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
}

export async function cancelTimerRunningNotification() {
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
  } catch (error) {
    console.warn('[TimerNotification] cancel failed:', error?.message ?? error);
  }
}

