/**
 * 스터디 카페 배경음악.
 * 앱에 넣어 둔 두 곡을 번갈아 틀고, 곡이 끝나면 30초 쉬었다가 다음 곡을 튼다.
 * 서버에서 받지 않으므로 전송량 비용이 들지 않고, 인터넷이 느려도 바로 나온다.
 * 켜기/끄기 상태는 기기에 저장한다 (처음에는 켜짐).
 */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKS = [
  require('../../assets/cafe/cafe-bgm-1.m4a'),
  require('../../assets/cafe/cafe-bgm-2.m4a'),
];
/** 곡과 곡 사이 쉬는 시간 */
const GAP_MS = 30 * 1000;
const VOLUME = 0.6;
const STORAGE_KEY = 'studyCafe.bgmEnabled';

let players = [];
let statusSubs = [];
let trackIndex = 0;
/** 카페 화면이 열려 있고 음악이 켜져 있는지 */
let active = false;
/** 지금 곡이 재생 중인지 (쉬는 시간이면 false) */
let playing = false;
let gapTimer = null;
let appStateSub = null;
let audioModeTask = null;

function loadExpoAudio() {
  return require('expo-audio');
}

async function ensureAudioMode() {
  // 뽀모도로 알림(phaseEndCue)과 같은 설정을 쓴다. 다르면 서로 덮어쓴다.
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

function getPlayer(index) {
  if (!players[index]) {
    const { createAudioPlayer } = loadExpoAudio();
    const player = createAudioPlayer(TRACKS[index]);
    player.volume = VOLUME;
    player.loop = false;
    statusSubs[index] = player.addListener('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish && index === trackIndex) onTrackFinished();
    });
    players[index] = player;
  }
  return players[index];
}

function clearGap() {
  if (gapTimer) {
    clearTimeout(gapTimer);
    gapTimer = null;
  }
}

function onTrackFinished() {
  // 같은 곡 끝 알림이 두 번 와도 한 번만 넘긴다
  if (!playing) return;
  playing = false;
  trackIndex = (trackIndex + 1) % TRACKS.length;
  clearGap();
  gapTimer = setTimeout(() => {
    gapTimer = null;
    if (active) playCurrent(true);
  }, GAP_MS);
}

async function playCurrent(fromStart) {
  try {
    await ensureAudioMode();
  } catch (err) {
    console.warn('[CafeBgm] audio mode failed', err?.message || err);
  }
  if (!active) return;
  try {
    const player = getPlayer(trackIndex);
    if (fromStart) {
      try {
        await player.seekTo(0);
      } catch {
        // 처음 불러오기 전에는 seek 가 실패할 수 있다. play 는 처음부터 튼다.
      }
    }
    if (!active) return;
    player.play();
    playing = true;
  } catch (err) {
    playing = false;
    console.warn('[CafeBgm] play failed', err?.message || err);
  }
}

function pauseAll() {
  clearGap();
  players.forEach((p) => {
    try {
      p?.pause();
    } catch {
      // noop
    }
  });
}

/** 켜면 멈췄던 곳부터 이어서 튼다. 쉬는 시간 중에 껐다면 다음 곡을 처음부터. */
function resume() {
  if (!active) return;
  if (gapTimer) return;
  const player = players[trackIndex];
  const halfway = playing && player && player.currentTime > 0;
  playCurrent(!halfway);
}

function onAppStateChange(state) {
  if (state === 'active') {
    resume();
  } else if (active) {
    // 앱을 내리면 멈춘다. 쉬는 시간이었다면 돌아왔을 때 다음 곡부터.
    const wasGap = Boolean(gapTimer);
    pauseAll();
    if (wasGap) playing = false;
  }
}

export async function loadCafeBgmEnabled() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw == null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function saveCafeBgmEnabled(enabled) {
  AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0').catch(() => {});
}

/** 음악을 켜거나 끈다. 카페 화면에서만 부른다. */
export function setCafeBgmOn(on) {
  if (on) {
    if (active) return;
    active = true;
    if (!appStateSub) {
      appStateSub = AppState.addEventListener('change', onAppStateChange);
    }
    if (AppState.currentState === 'active') resume();
  } else {
    if (!active) return;
    active = false;
    const wasGap = Boolean(gapTimer);
    pauseAll();
    if (wasGap) playing = false;
  }
}

/** 카페를 나갈 때: 멈추고 플레이어를 정리한다. 다음에 들어오면 첫 곡부터. */
export function releaseCafeBgm() {
  active = false;
  playing = false;
  clearGap();
  appStateSub?.remove();
  appStateSub = null;
  statusSubs.forEach((s) => s?.remove?.());
  players.forEach((p) => {
    try {
      p?.pause();
      p?.remove();
    } catch {
      // noop
    }
  });
  statusSubs = [];
  players = [];
  trackIndex = 0;
}
