import { useEffect, useRef, useState } from 'react';
import type { AgWidgetCustomCellRendererProps } from 'ag-studio-react';
import { markPaid, publishToPayPal, syncWithPayPal } from '../api';
import { bridge } from './actions';

export function VerificationCell({ value }: AgWidgetCustomCellRendererProps) {
  const kind = value === 'PayPal verified' ? 'verified' : value === 'Marked paid manually' ? 'manual' : 'unpaid';
  const icon = kind === 'verified' ? '✓ ' : '';
  return <span className={`badge badge-${kind}`}>{icon}{String(value ?? '')}</span>;
}

export function ActionsCell({ value, getLinkedValue }: AgWidgetCustomCellRendererProps) {
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const id = Number(getLinkedValue?.({ id: 'invoices.id', aggregation: 'first' }));
  const payUrl = String(getLinkedValue?.({ id: 'invoices.payUrl', aggregation: 'first' }) ?? '');

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    try {
      bridge.notify(await work());
      await bridge.refresh();
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  const actions: Record<string, () => Promise<string>> = {
    publish: async () => (await publishToPayPal(id), 'Invoice sent through PayPal'),
    sync: async () => (await syncWithPayPal(id)).outcome,
    markPaid: async () => (await markPaid(id)).outcome,
  };

  // Clicks are handled here, natively, and stopped before they reach the grid. Otherwise a click on
  // a button would also select the row and filter the whole dashboard down to that invoice.
  // (React's own onClick can't be used for this because it only sees events that reach the page root.)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onClick = (e: Event) => {
      e.stopPropagation();
      const name = (e.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action');
      if (name && !busy) void run(actions[name]);
    };
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('click', onClick);
    ['mousedown', 'pointerdown', 'dblclick'].forEach((n) => el.addEventListener(n, stop));
    return () => {
      el.removeEventListener('click', onClick);
      ['mousedown', 'pointerdown', 'dblclick'].forEach((n) => el.removeEventListener(n, stop));
    };
  });

  if (value === 'Done' || !id) return <span className="muted">Nothing to do</span>;
  if (value === 'On hold') {
    return <span className="muted" title="Chasing is paused until the dispute is resolved">On hold: disputed</span>;
  }

  return (
    <span className="actions" ref={box}>
      {value === 'Send via PayPal' ? (
        <button disabled={busy} data-action="publish">Send via PayPal</button>
      ) : (
        <>
          <button disabled={busy} data-action="sync">Check PayPal</button>
          {payUrl && (
            <a href={payUrl} target="_blank" rel="noreferrer">
              Pay link
            </a>
          )}
        </>
      )}
      <button
        className="ghost"
        disabled={busy}
        data-action="markPaid"
        title="Records the payment by hand. It is not verified through PayPal."
      >
        Mark paid
      </button>
    </span>
  );
}
