// Placeholder for the Overview page. It uses the same 24-column grid and the same row spans as the
// real report, so nothing jumps when the dashboard arrives.
const block = (col: string, rows: number, lines: number, tall = false) => (
  <div className="sk" style={{ gridColumn: col, gridRow: `span ${rows}` }}>
    <i className="short" />
    {tall && <i className="tall" />}
    {Array.from({ length: lines }, (_, n) => (
      <i key={n} className={n % 2 ? 'mid' : ''} />
    ))}
  </div>
);

export function Skeleton({ done }: { done: boolean }) {
  return (
    <div className={`sk-layer${done ? ' is-done' : ''}`} aria-hidden={done} role="status" aria-label="Loading the dashboard">
      {block('1 / span 10', 2, 0, true)}
      {block('11 / span 7', 2, 0, true)}
      {block('18 / span 7', 2, 0, true)}
      {block('1 / span 12', 5, 6)}
      {block('13 / span 7', 5, 6)}
      {block('20 / span 5', 5, 4)}
      {block('1 / span 24', 4, 6)}
    </div>
  );
}
