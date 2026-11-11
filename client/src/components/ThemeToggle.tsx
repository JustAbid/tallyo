import type { ReactElement } from 'react';
import type { ThemeChoice } from '../theme';

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const options: { id: ThemeChoice; label: string; icon: ReactElement }[] = [
  {
    id: 'light',
    label: 'Light theme',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" {...stroke} aria-hidden="true">
        <circle cx="8" cy="8" r="2.8" />
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </svg>
    ),
  },
  {
    id: 'dark',
    label: 'Dark theme',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" {...stroke} aria-hidden="true">
        <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
      </svg>
    ),
  },
  {
    id: 'system',
    label: 'Match my computer',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" {...stroke} aria-hidden="true">
        <rect x="1.8" y="2.5" width="12.4" height="8.2" rx="1.2" />
        <path d="M5.5 13.5h5M8 10.7v2.8" />
      </svg>
    ),
  },
];

export function ThemeToggle({ value, onChange }: { value: ThemeChoice; onChange: (choice: ThemeChoice) => void }) {
  return (
    <div className="theme" role="group" aria-label="Colour theme">
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} aria-label={o.label} title={o.label} onClick={() => onChange(o.id)}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}
