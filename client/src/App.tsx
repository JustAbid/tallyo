import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { loadAll, readNewReplies, resetDemo, type Customer, type Invoice, type Reply } from './api';
import { bridge, type Draft, type ToastKind } from './studio/actions';
import { aiSetup } from './studio/ai';
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reading, setReading] = useState(false);

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
    bridge.showDraft = setDraft;
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

  const unread = snapshot?.replies.filter((r) => !r.intent).length ?? 0;

  const readReplies = async () => {
    setReading(true);
    try {
      const results = await readNewReplies();
      const failed = results.filter((r) => r.error).length;
      await refresh();
      bridge.notify(failed ? `Read ${results.length - failed} replies, ${failed} failed` : `Read ${results.length} replies`, failed ? 'error' : 'ok');
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : 'Could not read the replies', 'error');
    } finally {
      setReading(false);
    }
  };

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
          <button disabled={reading || unread === 0} onClick={readReplies} title="Uses AI to understand each unread customer reply">
            {reading ? 'Reading…' : unread ? `Read ${unread} new ${unread === 1 ? 'reply' : 'replies'}` : 'No new replies'}
          </button>
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
              ai={aiSetup as any}
              onApiReady={(e: any) => {
                if (import.meta.env.DEV) (window as any).__studio = e.api;
              }}
              onErrorRaised={(e: any) => console.warn('Studio error', e)}
            />
          </AgStudioProvider>
        )}
      </main>

      {draft && (
        <div className="overlay" onClick={() => setDraft(null)}>
          <div className="draft" role="dialog" aria-label="Draft reminder" onClick={(e) => e.stopPropagation()}>
            <h2>Draft reminder for {draft.invoice}</h2>
            <p className="muted">Written by AI from the invoice facts. Nothing has been sent. Review it, then send it yourself.</p>
            <label>Subject</label>
            <div className="draft-box">{draft.subject}</div>
            <label>Message</label>
            <div className="draft-box draft-body">{draft.body}</div>
            <div className="draft-actions">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`);
                  bridge.notify('Copied to the clipboard');
                }}
              >
                Copy
              </button>
              <button className="ghost" onClick={() => setDraft(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}
