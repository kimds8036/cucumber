import { useEffect, useState } from 'react';

const STATS = [
  ['todayNewReports', '오늘 신규 신고'],
  ['pendingReports', '미처리 신고'],
  ['pendingAppeals', '이의신청 대기'],
  ['todayHandledReports', '오늘 처리 완료'],
  ['pendingInquiries', '미처리 문의'],
  ['todayAnsweredInquiries', '오늘 답변한 문의'],
  ['todayNewSignups', '오늘 신규 가입'],
  ['unverifiedUsers', '학생 미인증'],
  ['pendingStudentIdReviews', '학생증 검수 대기'],
];

export default function HomeScreen({ onOpenReports }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    window.fetchDashboardStats?.()
      .then((data) => {
        if (alive) setStats(data || {});
      })
      .catch((err) => {
        if (alive) setError(err?.message || '지표를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="m-empty">{error}</p>;
  if (!stats) return <p className="m-empty">불러오는 중…</p>;

  return (
    <div className="m-stat-grid">
      {STATS.map(([key, label]) => (
        <button key={key} type="button" className="m-stat" onClick={onOpenReports}>
          <strong>{Number(stats[key] || 0).toLocaleString()}</strong>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
