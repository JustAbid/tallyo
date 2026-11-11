// A tally mark: four strokes and the slash that closes the count of five.
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M7 5v18M12.5 5v18M18 5v18M23.5 5v18" />
      <path d="M3.5 21.5 26 6.5" />
    </svg>
  );
}
