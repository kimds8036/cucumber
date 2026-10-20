import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const LOCAL_KEY = '@yp/post_write_prompt_v1';
const BANNER_MS = 3 * 24 * 60 * 60 * 1000;

function emptyState() {
  return { status: null, skippedAt: null, showGuide: false, showBanner: false };
}

function derive(raw) {
  const serverDone = raw?.serverStatus === 'done';
  const status = serverDone ? 'done' : (raw?.status || null);
  const skippedAt = raw?.skippedAt || null;
  const skippedMs = skippedAt ? Date.now() - new Date(skippedAt).getTime() : 0;
  const withinBanner = Boolean(skippedAt) && skippedMs >= 0 && skippedMs < BANNER_MS;
  const bannerHidden = Boolean(raw?.bannerHidden);
  return {
    status,
    skippedAt,
    bannerHidden,
    showGuide: status === 'pending',
    showBanner: status === 'skipped' && withinBanner && !bannerHidden,
  };
}

function rememberServer(data) {
  return {
    status: data.status,
    skippedAt: data.skippedAt || null,
    serverStatus: data.status,
    bannerHidden: Boolean(data.bannerHidden),
  };
}

async function readLocal() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeLocal(next) {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
}

export async function fetchPostWritePrompt() {
  try {
    const res = await api.get('/api/users/me/post-write-prompt');
    const data = res.data?.data;
    if (data) {
      await writeLocal(rememberServer(data));
      return data;
    }
  } catch {
    // 서버에 컬럼이 없으면 이 기기 기록으로 본다.
  }
  return derive(await readLocal());
}

async function sendAction(action) {
  try {
    const res = await api.post('/api/users/me/post-write-prompt', { action });
    const data = res.data?.data;
    if (data) {
      await writeLocal(rememberServer(data));
      return data;
    }
  } catch {
    // 로컬에 남긴다.
  }
  const current = (await readLocal()) || {};
  if (current.serverStatus === 'done' || current.status === 'done') {
    const locked = { ...current, status: 'done', serverStatus: 'done' };
    await writeLocal(locked);
    return derive(locked);
  }
  let next = current;
  if (action === 'pending' && !current.status) {
    next = { ...current, status: 'pending', skippedAt: null };
  }
  if (action === 'skip') {
    next = {
      ...current,
      status: 'skipped',
      skippedAt: current.skippedAt || new Date().toISOString(),
    };
  }
  if (action === 'done') {
    next = { ...current, status: 'done', serverStatus: current.serverStatus || null, skippedAt: current.skippedAt || null };
  }
  if (action === 'dismiss') {
    next = { ...current, bannerHidden: true };
  }
  await writeLocal(next);
  return derive(next);
}

export function markPostWritePromptPending() {
  return sendAction('pending');
}

export function markPostWritePromptSkipped() {
  return sendAction('skip');
}

export function markPostWritePromptDone() {
  return sendAction('done');
}

export function dismissPostWritePromptBanner() {
  return sendAction('dismiss');
}

export async function loginAfterSignup(login, options = {}) {
  await markPostWritePromptPending().catch(() => {});
  await login({ ...options, postLoginRoute: 'PostWriteGuide' });
}

export { emptyState };
