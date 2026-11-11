// A tally mark: four strokes and the slash that closes the count of five.
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M7 5v18M12.5 5v18M18 5v18M23.5 5v18" />
      <path d="M3.5 21.5 26 6.5" />
    </svg>
  );
}

// The four-point sparkle that products use to say "an AI did this". Always paired with a text label.
export function Spark({ size = 13 }: { size?: number }) {
  return (
    <svg className="spark" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5c.6 4.6 2.3 7.9 4.6 9.6 1.6 1.2 3.4 1.7 5.9 1.9-5.9.9-9.1 3.7-10.5 10.5-.9-5.8-3.5-9.2-10.5-10.5 7-.9 9.6-4.4 10.5-11.5Z" />
    </svg>
  );
}
