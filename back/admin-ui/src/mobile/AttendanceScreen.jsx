import { useEffect, useState } from 'react';

function whenOf(value) {
  return typeof window.fmtDate === 'function' ? window.fmtDate(value) : '';
}

export default function AttendanceScreen() {
  const [today, setToday] = useState(null);
  const [suspicious, setSuspicious] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [todayPage, setTodayPage] = useState(1);
  const [susPage, setSusPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setError('');
    Promise.all([
      window.fetchTodayAttendance?.(1),
      window.fetchSuspiciousAttendance?.(1, {}),
    ]).then(([todayData, susData]) => {
      if (!alive) return;
      setToday(todayData || { users: [] });
      setSuspicious(susData || { users: [] });
      setTodayPage(1);
      setSusPage(1);
    }).catch((err) => {
      if (alive) setError(err?.message || '등교 현황을 불러오지 못했습니다.');
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const moreToday = async () => {
    const next = todayPage + 1;
    const data = await window.fetchTodayAttendance?.(next);
    setToday((prev) => ({ ...(data || {}), users: [...(prev?.users || []), ...(data?.users || [])] }));
    setTodayPage(next);
  };

  const moreSus = async () => {
    const next = susPage + 1;
    const data = await window.fetchSuspiciousAttendance?.(next, {});
    setSuspicious((prev) => ({ ...(data || {}), users: [...(prev?.users || []), ...(data?.users || [])] }));
    setSusPage(next);
  };

  if (error) {
    return (
      <div className="m-empty">
        <p>{error}</p>
        <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
      </div>
    );
  }
  if (!today || !suspicious) return <p className="m-empty">불러오는 중…</p>;

  const todayUsers = today.users || [];
  const susUsers = suspicious.users || [];
  const todayTotal = Number(today.total || today.pagination?.total || todayUsers.length);
  const susTotal = Number(suspicious.totalSuspicious ?? suspicious.pagination?.total ?? susUsers.length);

  return (
    <div className="m-reports">
      <h2 className="m-section-title">오늘 등교</h2>
      {todayUsers.length === 0 ? <p className="m-empty">오늘 등교한 사용자가 없습니다.</p> : (
        <div className="m-cards">
          {todayUsers.map((user) => (
            <article key={user.id} className="m-card">
              <div className="m-card-top"><span>@{user.username || '-'}</span><span>#{user.id}</span></div>
              <strong>{user.name || '-'}</strong>
              <p>{user.schoolName || '학교 없음'}</p>
              <div className="m-card-meta"><span>{whenOf(user.checkedAt)}</span></div>
            </article>
          ))}
        </div>
      )}
      {todayUsers.length < todayTotal ? <button type="button" className="m-more-btn" onClick={moreToday}>더 보기</button> : null}
      <h2 className="m-section-title">의심 계정</h2>
      {susUsers.length === 0 ? <p className="m-empty">의심 계정이 없습니다.</p> : (
        <div className="m-cards">
          {susUsers.map((user) => (
            <article key={user.id} className="m-card">
              <div className="m-card-top"><span>@{user.username || '-'}</span><span>{user.attendanceRate}%</span></div>
              <strong>{user.name || '-'}</strong>
              <p>{user.schoolName || user.schoolId || '학교 없음'}</p>
              <div className="m-card-meta">
                <span>{user.reason || '-'}</span>
                <span>{user.attendanceDays}/{user.schoolDaysInPeriod}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {susUsers.length < susTotal ? <button type="button" className="m-more-btn" onClick={moreSus}>더 보기</button> : null}
    </div>
  );
}
