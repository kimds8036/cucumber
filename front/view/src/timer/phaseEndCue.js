/**
 * 뽀모도로 집중·휴식이 끝났을 때의 알림.
 * 앱을 보고 있을 때는 music.mp3 를 직접 재생한다.
 * 알림 채널 소리는 포그라운드에서 나지 않는다.
 * 폰을 내려놓은 경우에는 알림으로 같은 파일을 울린다.
 */
import { AppState, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

const PHASE_SOUND_ASSET = require('../../../assets/music.mp3');
const PHASE_CUE_ID = 'focux-pomo-phase';
/** 채널 소리는 만든 뒤 안 바뀌므로, 파일 연결이 바뀌면 id 를 올린다. */
const PHASE_CHANNEL = 'pomo-phase-music-v3';
const RETIRED_CHANNELS = ['pomo-phase-music', 'pomo-phase-music-v2'];
const PHASE_SOUND = 'music.mp3';

let phasePlayer = null;
let audioModeTask = null;

function copyFor(notice) {
  if (notice?.endedPhase === 'focus') {
    return {
      title: '집중이 끝났어요',
      body:
        notice.nextPhase === 'long_break'
          ? '이제 긴 휴식이에요'
          : '이제 짧은 휴식이에요',
    };
  }
  return {
    title: '휴식이 끝났어요',
    body: '이제 집중할 시간이에요',
  };
}

export function vibratePhaseEnd() {
  Vibration.vibrate(Platform.OS === 'android' ? [0, 220, 120, 220] : 400);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

function loadExpoAudio() {
  return require('expo-audio');
}

function getPhasePlayer() {
  if (!phasePlayer) {
    const { createAudioPlayer } = loadExpoAudio();
    phasePlayer = createAudioPlayer(PHASE_SOUND_ASSET);
    phasePlayer.volume = 1;
  }
  return phasePlayer;
}

async function ensureAudioMode() {
  if (!audioModeTask) {
    const { setAudioModeAsync } = loadExpoAudio();
    audioModeTask = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    }).catch((error) => {
      audioModeTask = null;
      throw error;
    });
  }
  await audioModeTask;
}

/** 앱이 앞에 있을 때 music.mp3 를 미디어로 재생한다. */
async function playPhaseFile() {
  await ensureAudioMode();
  const player = getPhasePlayer();
  try {
    await player.seekTo(0);
  } catch {
    // 첫 로드 전 seek 는 실패할 수 있다. play 가 처음부터 튼다.
  }
  player.play();
}

async function ensurePhaseChannel() {
  if (Platform.OS !== 'android') return;
  for (const id of RETIRED_CHANNELS) {
    await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
  await Notifications.setNotificationChannelAsync(PHASE_CHANNEL, {
    name: '뽀모도로 종료',
    importance: Notifications.AndroidImportance.HIGH,
    sound: PHASE_SOUND,
    enableVibrate: false,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

async function notifyPhaseEnd(notice) {
  const copy = copyFor(notice);
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
}

export async function playPhaseEndSound(notice) {
  try {
    if (AppState.currentState === 'active') {
      await playPhaseFile();
      return;
    }
    await notifyPhaseEnd(notice);
  } catch (error) {
    console.warn('[PhaseEnd] sound failed:', error?.message ?? error);
    try {
      await playPhaseFile();
    } catch (fallbackError) {
      console.warn('[PhaseEnd] file playback failed:', fallbackError?.message ?? fallbackError);
    }
  }
}
