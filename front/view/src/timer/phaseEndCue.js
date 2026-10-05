/**
 * 뽀모도로 집중·휴식이 끝났을 때의 알림.
 * 팝업은 화면을 보고 있어야 하고, 소리·진동은 폰을 내려놔도 알 수 있다.
 */
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

const PHASE_CUE_ID = 'focux-pomo-phase';
const PHASE_CHANNEL = 'pomo-phase-music';
const PHASE_SOUND = 'music.mp3';

function copyFor(notice) {
  if (notice?.endedPhase === 'focus') {
    return {
      title: '집중이 끝났어요',
      body: notice.nextPhase === 'long_break' ? '이제 긴 휴식이에요' : '이제 짧은 휴식이에요',
    };
  }
  return {
    title: '휴식이 끝났어요',
    body: '이제 집중할 시간이에요',
  };
}

export function vibratePhaseEnd() {
  Vibration.vibrate(Platform.OS === 'android' ? [0, 220, 120, 220] : 400);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

async function ensurePhaseChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PHASE_CHANNEL, {
    name: '뽀모도로 종료',
    importance: Notifications.AndroidImportance.HIGH,
    sound: PHASE_SOUND,
    enableVibrate: false,
  });
}

export async function playPhaseEndSound(notice) {
  const copy = copyFor(notice);
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      if (asked.status !== 'granted') return;
    }
    await ensurePhaseChannel();
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const item of presented) {
      if (item?.request?.content?.data?.identifier === PHASE_CUE_ID) {
        await Notifications.dismissNotificationAsync(item.request.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        sound: PHASE_SOUND,
        data: { kind: 'pomodoro-phase-cue', identifier: PHASE_CUE_ID },
      },
      trigger: Platform.OS === 'android' ? { channelId: PHASE_CHANNEL } : null,
    });
  } catch (error) {
    console.warn('[PhaseEnd] sound failed:', error?.message ?? error);
  }
}
