import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { loadAll, resetDemo, type Customer, type Invoice, type Reply } from './api';
import { bridge, type ToastKind } from './studio/actions';
import { buildStudioData } from './studio/data';
import { defaultReport } from './studio/report';
import { tallyoTheme } from './studio/theme';
import { widgets } from './studio/widgets';

interface Snapshot {
  invoices: Invoice[];
  customers: Customer[];
  replies: Reply[];
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [toast, setToast] = useState<{ text: string; kind: ToastKind } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await loadAll());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the Tallyo server');
    }
  }, []);

  useEffect(() => {
    bridge.refresh = refresh;
    bridge.notify = (text, kind = 'ok') => {
      setToast({ text, kind });
      window.setTimeout(() => setToast(null), 4500);
    };
    refresh();
  }, [refresh]);

  // follow the operating system's light or dark setting
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.setAttribute('data-ag-theme-mode', query.matches ? 'dark' : 'light');
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const data = useMemo(
    () => (snapshot ? buildStudioData(snapshot.invoices, snapshot.customers, snapshot.replies) : null),
    [snapshot],
  );

  const reset = async () => {
    if (!window.confirm('Reset all demo data? PayPal payments you recorded here will be forgotten.')) return;
    await resetDemo();
    await refresh();
    bridge.notify('Demo data reset');
  };

  return (
    <div className="shell">
      <header>
        <div className="brand">
          <span className="logo">T</span>
          <div>
            <h1>Tallyo</h1>
            <p>Get paid on time, without the awkward emails.</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="demo-pill">Demo data · PayPal Sandbox</span>
          <button className="ghost" onClick={refresh}>Refresh</button>
          <button className="ghost" onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}>
            {mode === 'view' ? 'Customise dashboard' : 'Done customising'}
          </button>
          <button className="ghost" onClick={reset}>Reset demo</button>
        </div>
      </header>

      <main>
        {error && (
          <div className="notice">
            Can't reach the Tallyo server ({error}). Start it with <code>npm run dev</code> in the <code>server</code> folder.
          </div>
        )}
        {data && (
          <AgStudioProvider licenseKey={import.meta.env.VITE_AG_STUDIO_LICENSE}>
            <AgStudio
              data={data as any}
              mode={mode}
              theme={tallyoTheme}
              widgets={widgets as any}
              initialState={defaultReport as any}
              onApiReady={(e: any) => {
                if (import.meta.env.DEV) (window as any).__studio = e.api;
              }}
              onErrorRaised={(e: any) => console.warn('Studio error', e)}
            />
          </AgStudioProvider>
        )}
      </main>

      {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}
