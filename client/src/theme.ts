import { useEffect, useState } from 'react';

// Light, dark, or follow the system. "System" is stored as no value at all, so a person who
// never touches the toggle always follows their operating system.
export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'tallyo-theme';
const dark = () => window.matchMedia('(prefers-color-scheme: dark)');

function stored(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system'; // storage can be blocked (private windows, strict settings)
  }
}

function apply(choice: ThemeChoice) {
  const mode = choice === 'system' ? (dark().matches ? 'dark' : 'light') : choice;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-ag-theme-mode', mode); // AG Studio reads its own attribute
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(stored);

  useEffect(() => {
    apply(choice);
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* the choice still applies for this visit */
    }
    if (choice !== 'system') return;
    const query = dark();
    const follow = () => apply('system');
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [choice]);

  return [choice, setChoice] as const;
}
