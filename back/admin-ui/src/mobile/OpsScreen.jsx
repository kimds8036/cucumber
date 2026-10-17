import { useCallback, useEffect, useState } from 'react';
import MonitorDetail from './MonitorDetail.jsx';
import { useAutoRefresh, usePullRefresh } from './useAutoRefresh.js';

function n(value) {
  return Number(value || 0).toLocaleString();
}

function Bars({ series, pick }) {
  if (!series?.length) return null;
  const max = Math.max(...series.map((row) => pick(row)), 1);
  return (
    <div className="m-chart" aria-hidden="true">
      {series.map((row, index) => (
        <div className="m-chart-col" key={index}>
          <div className="m-chart-track">
            <span style={{ height: `${Math.max(8, Math.round((pick(row) / max) * 100))}%`, background: '#7c3aed' }} />
          </div>
          <em>{String(row.date || row.ymd || '').slice(5)}</em>
        </div>
      ))}
    </div>
  );
}

function RegionBars({ regions }) {
  const max = Math.max(...regions.map((row) => Number(row.userCount) || 0), 1);
  return (
    <div className="m-cards">
      {regions.map((row) => (
        <article key={row.region} className="m-card">
          <div className="m-card-top"><span>{row.region}</span><strong>{n(row.userCount)}</strong></div>
          <div className="m-bar"><span style={{ width: `${Math.round((Number(row.userCount) || 0) / max * 100)}%` }} /></div>
          <p>학교 {n(row.schoolCount)}곳</p>
        </article>
      ))}
    </div>
  );
}

async function loadView(view, days) {
  if (view === 'user') return window.fetchOpsUserEcosystem?.();
  if (view === 'timer') return window.fetchTimerOps?.(days);
  if (view === 'study-rooms') return window.fetchStudyRoomOps?.();
  if (view === 'activity') return window.fetchActivityOps?.(days);
  if (view === 'terms') return window.fetchOpsSchoolTerms?.();
  if (view === 'map') return window.fetchOpsSchoolGeo?.();
  if (view === 'funnel') return window.fetchAppInstallFunnelStats?.(days);
  if (view === 'reach') {
    const [overview, install] = await Promise.all([
      window.fetchAnalyticsOverview?.(days),
      window.fetchInstallLandingStats?.(days),
    ]);
    return { overview: overview || {}, install: install || {} };
  }
  return {};
}

function present(view, data) {
  if (view === 'user') {
    return {
      summaries: [
        { label: '학생', value: n(data?.users) },
        { label: '학교', value: n(data?.schools) },
        { label: 'iPhone', value: n(data?.iosUsers) },
        { label: 'Android', value: n(data?.androidUsers) },
      ],
      note: '학교별 시간표와 상세 표는 PC에서 확인해주세요.',
      items: [],
    };
  }
  if (view === 'timer') {
    const summary = data?.summary || {};
    return {
      summaries: [
        { label: '오늘 이용', value: n(summary.activeUsers || summary.todayUsers) },
        { label: '진행 중', value: n(summary.openUsers) },
        { label: '총 시간', value: n(summary.totalHours) },
        { label: '세션', value: n((data?.recentSessions || []).length) },
      ],
      chart: <Bars series={data?.series || []} pick={(row) => Number(row.activeUsers || 0)} />,
      items: (data?.recentSessions || []).map((row) => ({
        title: row.username || row.schoolName || '세션',
        meta: [row.schoolName, row.startedAt || row.date].filter(Boolean).join(' · '),
      })),
      note: '세션 원본 표의 나머지 칸은 PC에서 확인해주세요.',
    };
  }
  if (view === 'study-rooms') {
    return {
      summaries: [
        { label: '열린 방', value: n(data?.openRoomCount) },
        { label: '방', value: n(data?.roomCount) },
        { label: '참여자', value: n(data?.memberCount) },
        { label: '정원', value: n(data?.capacity) },
      ],
      items: (data?.rooms || []).map((room) => ({
        title: room.name || `방 ${room.id || ''}`,
        meta: `참여 ${n(room.memberCount)}`,
      })),
    };
  }
  if (view === 'activity') {
    const summary = data?.summary || {};
    return {
      summaries: [
        { label: '오늘 글', value: n(summary.todayPosts) },
        { label: '댓글', value: n(summary.todayComments) },
        { label: '채팅', value: n(summary.todayChat) },
        { label: '쪽지', value: n(summary.todayPersonalMail) },
      ],
      chart: <Bars series={data?.series || []} pick={(row) => Number(row.posts || 0)} />,
      note: '활동 피드 표는 PC에서 확인해주세요.',
      items: [],
    };
  }
  if (view === 'terms') {
    const summary = data?.summary || {};
    return {
      summaries: [
        { label: '오늘 등교일', value: n(summary.schoolDayToday) },
        { label: '학기 중', value: n(summary.inSessionToday) },
        { label: '가입 학교', value: n(summary.schools) },
        { label: '학기 미적재', value: n(summary.missingTerms) },
      ],
      items: (data?.schools || []).map((school) => ({
        title: school.schoolName || '학교',
        meta: `학생 ${n(school.userCount)} · 오늘 ${school.today?.schoolDay ? '등교일' : '아님'}`,
      })),
      note: '학년·학기 10열 표는 PC에서 확인해주세요.',
    };
  }
  if (view === 'map') {
    const summary = data?.summary || {};
    return {
      summaries: [
        { label: '학생', value: n(summary.users) },
        { label: '학교', value: n(summary.schools) },
      ],
      chart: <RegionBars regions={data?.regions || []} />,
      note: '지도는 PC에서 확인해주세요.',
      items: [],
    };
  }
  if (view === 'reach') {
    const summary = data?.overview?.summary || {};
    const install = data?.install?.summary || {};
    return {
      summaries: [
        { label: 'DAU', value: n(summary.dauCount || summary.dau) },
        { label: 'MAU', value: n(summary.mauCount || summary.mau) },
        { label: '설치', value: n(install.hits || install.totalHits) },
        { label: '오늘 설치', value: n(install.todayHits) },
      ],
      chart: <Bars series={data?.overview?.series || []} pick={(row) => Number(row.dauCount || 0)} />,
      note: '히트맵, 화면 순위, 시간대 표는 PC에서 확인해주세요.',
      items: [],
    };
  }
  return {
    summaries: [
      { label: '미전환', value: n(data?.openUnconverted) },
      { label: '오늘 첫 실행', value: n(data?.firstOpenTodayUnconverted) },
      { label: '오늘 가입', value: n(data?.convertedToday) },
      { label: '전환율', value: `${Number(data?.convertRatePct || 0)}%` },
    ],
    chart: <Bars series={data?.series || []} pick={(row) => Number(row.firstOpens || 0)} />,
    items: [
      { title: '설치(첫 실행)', meta: n(data?.firstOpen7dUnconverted) },
      { title: '가입 전환', meta: n(data?.converted7d) },
      { title: '아직 미가입', meta: n(data?.openUnconverted) },
    ],
  };
}

export default function OpsScreen({ view }) {
  const ranged = view === 'timer' || view === 'activity' || view === 'reach' || view === 'funnel';
  const [range, setRange] = useState('7');
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shown, setShown] = useState(10);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await loadView(view, Number(range));
      setModel(present(view, data || {}));
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || '모니터링을 불러오지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, [view, range]);

  useEffect(() => {
    setShown(10);
    refresh();
  }, [refresh]);
  useAutoRefresh(refresh, 30000);
  const pull = usePullRefresh(refresh);

  if (error && !model) {
    return (
      <div className="m-empty">
        <p>{error}</p>
        <button type="button" className="m-more-btn" onClick={refresh}>재시도</button>
      </div>
    );
  }
  if (!model) return <p className="m-empty">불러오는 중…</p>;

  return (
    <>
      <MonitorDetail
        range={ranged ? range : undefined}
        onRange={ranged ? (next) => setRange(next) : null}
        summaries={model.summaries}
        chart={model.chart}
        items={(model.items || []).map((item, index) => ({
          id: `${index}-${item.title}`,
          title: item.title,
          body: item.meta,
        }))}
        shown={shown}
        onMore={() => setShown((value) => value + 10)}
        updatedAt={updatedAt}
        refreshing={refreshing}
        pull={pull}
        note={model.note || ''}
        empty=""
      />
    </>
  );
}
