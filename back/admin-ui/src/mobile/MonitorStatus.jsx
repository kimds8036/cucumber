import MonitorDetail from './MonitorDetail.jsx';

const TEXT = {
  ok: '정상',
  danger: '장애',
  unknown: '미확인',
};

export default function MonitorStatus({ label, state = 'unknown', updatedAt }) {
  return (
    <MonitorDetail
      summaries={[{ label, value: TEXT[state] || TEXT.unknown }]}
      items={[]}
      updatedAt={updatedAt}
      empty="이 상태는 대시보드 집계와 같은 값을 보여 줍니다. 소켓·푸시는 아직 미확인입니다."
    />
  );
}
