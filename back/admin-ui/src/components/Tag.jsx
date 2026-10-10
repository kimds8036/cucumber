export default function Tag({ tone = 'neutral', children }) {
  return <span className={`console-tag console-tag-${tone}`}>{children}</span>;
}
