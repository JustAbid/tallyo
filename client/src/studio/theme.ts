import { studioTheme } from 'ag-studio';

const font = "Inter, system-ui, 'Segoe UI', sans-serif";

// Chart colours are picked so the payment-check donut reads at a glance:
// amber = still unpaid, green = verified by PayPal, grey = marked paid by hand.
const palette = {
  chartPaletteFills1Color: '#d97706',
  chartPaletteFills2Color: '#16a34a',
  chartPaletteFills3Color: '#94a3b8',
  chartPaletteFills4Color: '#0f766e',
  chartPaletteFills5Color: '#e11d48',
  chartPaletteFills6Color: '#6366f1',
};

// Tallyo's look: calm green on a soft background, with a light and a dark mode.
export const tallyoTheme = studioTheme
  .withParams(
    {
      accentColor: '#0f766e',
      backgroundColor: '#ffffff',
      foregroundColor: '#1f2937',
      borderColor: '#e5e7eb',
      fontFamily: font,
      borderRadius: 10,
      browserColorScheme: 'light',
      ...palette,
    },
    'light',
  )
  .withParams(
    {
      accentColor: '#2dd4bf',
      backgroundColor: '#111827',
      foregroundColor: '#e5e7eb',
      borderColor: '#2b3445',
      fontFamily: font,
      borderRadius: 10,
      browserColorScheme: 'dark',
      ...palette,
    },
    'dark',
  );
