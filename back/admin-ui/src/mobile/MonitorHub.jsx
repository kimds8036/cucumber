import { useCallback, useEffect, useRef, useState } from 'react';
import { canAccess } from '../nav.js';
import { useAutoRefresh, usePullRefresh } from './useAutoRefresh.js';

export const MONITOR_ITEMS = [
  { id: 'ops-user', label: '사용자', view: 'user', metric: '학생' },
  { id: 'ops-timer', label: '타이머', view: 'timer', metric: '오늘 이용' },
  { id: 'ops-study', label: '스터디룸', view: 'study-rooms', metric: '열린 방' },
  { id: 'ops-activity', label: '앱 활동', view: 'activity', metric: '오늘 글' },
  { id: 'ops-jobs', label: '크론', view: 'jobs', metric: '대기 예약' },
  { id: 'ops-terms', label: '등교·학기', view: 'terms', metric: '오늘 등교일' },
  { id: 'ops-map', label: '전국 분포', view: 'map', metric: '학생' },
  { id: 'ops-reach', label: '이용·설치', view: 'reach', metric: 'DAU' },
  { id: 'ops-funnel', label: '설치 후 미가입', view: 'funnel', metric: '미전환' },
];

const DOTS = [
  { key: 'api', label: 'API', view: 'status' },
  { key: 'db', label: 'DB', view: 'status' },
  { key: 'socket', label: '소켓', view: 'status' },
  { key: 'cron', label: '크론', view: 'jobs' },
  { key: 'push', label: '푸시', view: 'status' },
];

function pendingCount(reservations) {
  return (reservations?.byStatus || [])
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function stampOf(date) {
  if (!date) return '갱신 전';
  return `마지막 갱신 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export default function MonitorHub({ role, health = {}, onOpen }) {
  const [live, setLive] = useState({});
  const [cronValue, setCronValue] = useState(null);
  const [cronDelta, setCronDelta] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const previousWaiting = useRef(null);
  const allowed = canAccess(role, 'ops');

  const refresh = useCallback(async () => {
    if (!allowed) return;
    setRefreshing(true);
    const next = {};
    try {
      await window.fetchDashboardStats?.();
      next.api = 'ok';
      next.db = 'ok';
    } catch {
      next.api = 'danger';
      next.db = 'danger';
    }
    try {
      const data = await window.fetchBatchJobs?.();
      const waiting = pendingCount(data?.reservations);
      const failed = (data?.runs || []).some((row) => row.status === 'failed');
      next.cron = failed ? 'danger' : 'ok';
      const prev = previousWaiting.current;
      if (prev == null) setCronDelta('');
      else if (waiting === prev) setCronDelta('변동 없음');
      else setCronDelta(waiting > prev ? `+${waiting - prev}` : String(waiting - prev));
      previousWaiting.current = waiting;
      setCronValue(waiting);
    } catch {
      next.cron = 'danger';
    }
    setLive(next);
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, [allowed]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAutoRefresh(refresh);
  const pull = usePullRefresh(refresh);

  const stateOf = (key) => live[key] || health[key] || 'unknown';

  if (!allowed) {
    return <p className="m-empty">모니터링은 운영관리자만 볼 수 있습니다.</p>;
  }

  return (
    <div className="m-monitor" onTouchStart={pull.onTouchStart} onTouchEnd={pull.onTouchEnd}>
      <p className="m-updated">{refreshing ? '갱신 중…' : stampOf(updatedAt)} · 당겨서 새로고침</p>
      <div className="m-dots">
        {DOTS.map((dot) => {
          const state = stateOf(dot.key);
          return (
            <button key={dot.key} type="button" onClick={() => onOpen(dot.view, { label: dot.label, state })}>
              <i className={state === 'danger' ? 'is-bad' : state === 'ok' ? 'is-ok' : ''} />
              <span>{dot.label}</span>
            </button>
          );
        })}
      </div>
      <div className="m-hub-grid">
        {MONITOR_ITEMS.map((item) => {
          const ready = item.id === 'ops-jobs';
          return (
            <button key={item.id} type="button" className="m-hub-card" onClick={() => onOpen(ready ? 'jobs' : 'soon', item)}>
              <span>{item.label}</span>
              <strong>{ready && cronValue != null ? cronValue.toLocaleString() : '—'}</strong>
              <em>{ready ? (cronDelta || item.metric) : '다음 단계'}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}
