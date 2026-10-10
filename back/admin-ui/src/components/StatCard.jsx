export default function StatCard({ label, value, delta, tone = 'neutral' }) {
  return (
    <article className={`console-stat console-stat-${tone}`}>
      <div className="console-stat-value">{value}</div>
      <div className="console-stat-label">{label}</div>
      {delta ? <div className="console-stat-delta">{delta}</div> : null}
    </article>
  );
}
