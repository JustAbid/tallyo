import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { getAiStatus, loadAll, readNewReplies, resetDemo, type Customer, type Invoice, type Reply } from './api';
import { ComposeDialog } from './components/ComposeDialog';
import { Mark, Spark } from './components/Brand';
import { Skeleton } from './components/Skeleton';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './theme';
import { bridge, type ToastKind } from './studio/actions';
import { aiSetup } from './studio/ai';
import { buildStudioData } from './studio/data';
import type { Compose } from './studio/mail';
import { defaultReport } from './studio/report';
import { tallyoTheme } from './studio/theme';
import { widgets } from './studio/widgets';

interface Snapshot {
  invoices: Invoice[];
  customers: Customer[];
  replies: Reply[];
}

const pages = [
  { id: 'overview', label: 'Overview' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'replies', label: 'Replies' },
  { id: 'customers', label: 'Customers' },
];

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studioReady, setStudioReady] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [toast, setToast] = useState<{ text: string; kind: ToastKind } | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [reading, setReading] = useState(false);
  const [page, setPage] = useState('overview');
  const [skeletonGone, setSkeletonGone] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [theme, setTheme] = useTheme();
  const studioApi = useRef<any>(null);

  const goTo = (id: string) => {
    const api = studioApi.current;
    if (!api) return;
    api.setState({ ...api.getState(), selectedPageId: id });
    setPage(id);
  };

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
    bridge.compose = setCompose;
    bridge.notify = (text, kind = 'ok') => {
      setToast({ text, kind });
      window.setTimeout(() => setToast(null), 4500);
    };
    refresh();
  }, [refresh]);

  // let the loading skeleton finish fading, then remove it from the page for good
  useEffect(() => {
    if (!studioReady) return;
    const timer = window.setTimeout(() => setSkeletonGone(true), 450);
    return () => window.clearTimeout(timer);
  }, [studioReady]);

  useEffect(() => {
    getAiStatus().then((s) => setAiReady(s.keyPresent), () => setAiReady(null));
  }, []);

  const data = useMemo(
    () => (snapshot ? buildStudioData(snapshot.invoices, snapshot.customers, snapshot.replies) : null),
    [snapshot],
  );

  const unread = snapshot?.replies.filter((r) => !r.intent).length ?? 0;

  const readReplies = async () => {
    setReading(true);
    try {
      const results = await readNewReplies();
      const failed = results.filter((r) => r.error).length;
      await refresh();
      bridge.notify(
        failed ? `Read ${results.length - failed} of ${results.length} replies. ${failed} could not be read.` : `Read ${results.length} ${results.length === 1 ? 'reply' : 'replies'}.`,
        failed ? 'error' : 'ok',
      );
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : 'Could not read the replies', 'error');
    } finally {
      setReading(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset the demo data? Payments you recorded here will be forgotten, but nothing in PayPal is touched.')) return;
    try {
      await resetDemo();
      await refresh();
      bridge.notify('Demo data reset.');
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : 'Could not reset the data', 'error');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Mark />
          <span className="wordmark">Tallyo</span>
          <span className="brand-note">Overdue invoices, customer replies and PayPal payments in one place</span>
        </div>
        <div className="controls">
          {aiReady !== null && (
            <span className={`ai-status${aiReady ? '' : ' is-off'}`} title={aiReady ? 'The AI key is set on the server' : 'Add AI_API_KEY to server/.env to turn the AI features on'}>
              <Spark size={12} />
              {aiReady ? 'AI agent ready' : 'AI key missing'}
            </span>
          )}
          <button className={`btn btn-ai${reading ? ' is-busy' : ''}`} disabled={reading || unread === 0} onClick={readReplies} title="Uses AI to work out what each unread reply is asking for">
            {reading ? <span className="spinner" /> : <Spark />}
            {reading ? 'Reading' : unread ? `Read ${unread} new ${unread === 1 ? 'reply' : 'replies'}` : 'No new replies'}
          </button>
          <button className="btn btn-quiet" onClick={refresh}>
            Refresh
          </button>
          <div className="seg" role="group" aria-label="Dashboard mode">
            <button aria-pressed={mode === 'view'} onClick={() => setMode('view')}>
              View
            </button>
            <button aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
              Customise
            </button>
          </div>
          <ThemeToggle value={theme} onChange={setTheme} />
        </div>
      </header>

      <nav className="tabs" aria-label="Dashboard pages">
        {pages.map((p) => (
          <button key={p.id} className="tab" aria-current={page === p.id ? 'page' : undefined} onClick={() => goTo(p.id)} disabled={!studioReady}>
            {p.label}
            {p.id === 'replies' && unread > 0 && <span className="tab-count">{unread}</span>}
          </button>
        ))}
      </nav>

      <div className="stage">
        {error && (
          <div className="notice" role="alert">
            <strong>Tallyo can't reach its server.</strong>
            <span>{error}. Start it with <code>npm run dev</code> in the <code>server</code> folder, then try again.</span>
            <div>
              <button className="btn" onClick={refresh}>
                Try again
              </button>
            </div>
          </div>
        )}

        {!error && !skeletonGone && <Skeleton done={studioReady} />}

        {data && (
          <div className={`studio${studioReady ? ' is-ready' : ''}`}>
            <AgStudioProvider licenseKey={import.meta.env.VITE_AG_STUDIO_LICENSE}>
              <AgStudio
                data={data as any}
                mode={mode}
                theme={tallyoTheme}
                widgets={widgets as any}
                initialState={defaultReport as any}
                ai={aiSetup as any}
                onApiReady={(e: any) => {
                  studioApi.current = e.api;
                  if (import.meta.env.DEV) (window as any).__studio = e.api;
                  window.setTimeout(() => setStudioReady(true), 350);
                }}
                onErrorRaised={(e: any) => console.warn('Studio error', e)}
              />
            </AgStudioProvider>
          </div>
        )}
      </div>

      <footer className="statusbar">
        <span>
          <span className="dot" />
          PayPal Sandbox. No real money moves.
        </span>
        <span>Demo data</span>
        <span className="spacer" />
        <button onClick={reset}>Reset demo data</button>
      </footer>

      {compose && <ComposeDialog draft={compose} onClose={() => setCompose(null)} onNotify={(m) => bridge.notify(m, 'error')} />}
      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
