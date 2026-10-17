import { useCallback, useEffect, useRef, useState } from 'react';
import MonitorDetail from './MonitorDetail.jsx';
import { useAutoRefresh, usePullRefresh } from './useAutoRefresh.js';

function inRange(value, range) {
  const at = new Date(value || 0).getTime();
  if (!Number.isFinite(at) || at <= 0) return false;
  const days = range === '30' ? 30 : range === '7' ? 7 : 1;
  return Date.now() - at <= days * 24 * 60 * 60 * 1000;
}

function pendingCount(reservations) {
  return (reservations?.byStatus || [])
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function deltaText(current, previous) {
  if (previous == null) return { delta: '', deltaTone: '' };
  const diff = current - previous;
  if (diff === 0) return { delta: '변동 없음', deltaTone: '' };
  return diff > 0
    ? { delta: `+${diff}`, deltaTone: 'is-up' }
    : { delta: String(diff), deltaTone: 'is-down' };
}

function statusLabel(status) {
  if (typeof window.cronStatusKo === 'function') return window.cronStatusKo(status);
  if (status === 'success') return '잘됨';
  if (status === 'failed') return '실패';
  if (status === 'skipped') return '건너뜀';
  return status || '-';
}

function CronBars({ runs }) {
  const buckets = [
    { label: '잘됨', count: runs.filter((row) => row.status === 'success').length, color: '#3fb950' },
    { label: '실패', count: runs.filter((row) => row.status === 'failed').length, color: '#f85149' },
    { label: '건너뜀', count: runs.filter((row) => row.status === 'skipped').length, color: '#d29922' },
  ];
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <div className="m-chart" aria-label="실행 상태">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="m-chart-col">
          <div className="m-chart-track">
            <span style={{ height: `${Math.max(bucket.count ? 8 : 0, (bucket.count / max) * 100)}%`, background: bucket.color }} />
          </div>
          <strong>{bucket.count}</strong>
          <em>{bucket.label}</em>
        </div>
      ))}
    </div>
  );
}

export default function CronScreen() {
  const [range, setRange] = useState('7');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(10);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const previous = useRef({});
  const writtenAt = useRef(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await window.fetchBatchJobs?.();
      setData(next || {});
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || '크론 현황을 불러오지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAutoRefresh(refresh);
  const pull = usePullRefresh(refresh);

  const runs = (data?.runs || []).filter((row) => inRange(row.finished_at, range));
  const failed = runs.filter((row) => row.status === 'failed').length;
  const waiting = pendingCount(data?.reservations);
  const jobs = data?.catalog?.jobs?.length || 0;
  const prior = previous.current[range];
  const deltas = {
    failed: deltaText(failed, prior?.failed),
    waiting: deltaText(waiting, prior?.waiting),
    runs: deltaText(runs.length, prior?.runs),
  };
  useEffect(() => {
    if (!updatedAt) return;
    const at = updatedAt.getTime();
    if (writtenAt.current === at) return;
    writtenAt.current = at;
    previous.current[range] = { failed, waiting, runs: runs.length };
  }, [updatedAt, range, failed, waiting, runs.length]);

  const items = runs.map((row, index) => {
    const job = (data?.catalog?.jobs || []).find((entry) => entry.key === row.job_name);
    return {
      id: `${row.job_name}-${row.finished_at}-${index}`,
      kicker: statusLabel(row.status),
      trailing: typeof window.fmtDate === 'function' ? window.fmtDate(row.finished_at) : '',
      title: job?.title || row.job_name,
      body: `${job?.when || '일정 없음'} · ${Number(row.elapsed_ms || 0)}ms`,
    };
  });

  return (
    <MonitorDetail
      range={range}
      onRange={(next) => {
        setRange(next);
        setShown(10);
      }}
      summaries={[
        { label: '실패', value: String(failed), ...deltas.failed },
        { label: '대기 예약', value: String(waiting), ...deltas.waiting },
        { label: '실행 기록', value: String(runs.length), ...deltas.runs },
        { label: '등록 작업', value: String(jobs) },
      ]}
      chart={<CronBars key={range} runs={runs} />}
      items={items}
      shown={shown}
      onMore={() => setShown((count) => count + 10)}
      updatedAt={updatedAt}
      refreshing={refreshing}
      pull={pull}
      note={error || '실행 커서와 원문 표는 PC에서 확인해주세요.'}
      empty="이 기간의 실행 기록이 없습니다."
    />
  );
}
