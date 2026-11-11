import { studioTheme } from 'ag-studio';

const font = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

// Colours have jobs. The donut reads left to right as: still unpaid (ink blue), confirmed by PayPal
// (green), recorded by hand (amber). Red is kept for things that are late.
const light = {
  accentColor: '#23506f',
  backgroundColor: '#fdfdfc',
  foregroundColor: '#181c1f',
  borderColor: '#d3d8d6',
  oddRowBackgroundColor: '#f4f6f5',
  chartPaletteFills1Color: '#23506f',
  chartPaletteFills2Color: '#2a734a',
  chartPaletteFills3Color: '#b27200',
  chartPaletteFills4Color: '#b3261e',
  chartPaletteFills5Color: '#6b7a84',
  chartPaletteFills6Color: '#5b7f95',
};

const dark = {
  accentColor: '#86b6de',
  backgroundColor: '#151b1f',
  foregroundColor: '#e8ecee',
  borderColor: '#26313a',
  oddRowBackgroundColor: '#12181b',
  chartPaletteFills1Color: '#86b6de',
  chartPaletteFills2Color: '#7fcb9c',
  chartPaletteFills3Color: '#e4b25c',
  chartPaletteFills4Color: '#f0948b',
  chartPaletteFills5Color: '#9aa6ae',
  chartPaletteFills6Color: '#6f9db8',
};

const shared = { fontFamily: font, borderRadius: 4, fontSize: 13 };

export const tallyoTheme = studioTheme
  .withParams({ ...light, ...shared, browserColorScheme: 'light' } as any, 'light')
  .withParams({ ...dark, ...shared, browserColorScheme: 'dark' } as any, 'dark');
