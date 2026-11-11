import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AgWidgetCustomCellRendererProps } from 'ag-studio-react';
import { draftReminder, markPaid, publishToPayPal, syncWithPayPal } from '../api';
import { bridge } from './actions';

type Linked = AgWidgetCustomCellRendererProps['getLinkedValue'];
const linked = (get: Linked, id: string) => get?.({ id, aggregation: 'first' });

/**
 * Clicks on buttons inside a Studio table cell are handled natively and stopped before they reach
 * the grid. Otherwise pressing a button would also select the row and filter the whole dashboard.
 * (React's own onClick can't do this, because it only sees events that reach the page root.)
 */
function useCellClicks(handle: (action: string, target: HTMLElement) => void) {
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef(handle);
  latest.current = handle;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: Event) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (target) latest.current(target.dataset.action!, target);
    };
    const stop = (e: Event) => e.stopPropagation();
    const quiet = ['mousedown', 'pointerdown', 'dblclick'];
    el.addEventListener('click', onClick);
    quiet.forEach((n) => el.addEventListener(n, stop));
    return () => {
      el.removeEventListener('click', onClick);
      quiet.forEach((n) => el.removeEventListener(n, stop));
    };
  }, []);
  return ref;
}

export function VerificationCell({ value }: AgWidgetCustomCellRendererProps) {
  const kind = value === 'PayPal verified' ? 'verified' : value === 'Marked paid manually' ? 'manual' : 'unpaid';
  return (
    <span className={`badge badge-${kind}`}>
      {kind === 'verified' && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6.5 5 9l4.5-5.5" />
        </svg>
      )}
      {String(value ?? '')}
    </span>
  );
}

interface MenuItem {
  label: string;
  hint?: string;
  href?: string;
  onSelect?: () => void;
}

function Menu({ anchor, items, onClose }: { anchor: DOMRect; items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.menu, [data-action="menu"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  const style = { top: anchor.bottom + 4, right: Math.max(8, window.innerWidth - anchor.right) };
  return createPortal(
    <div className="menu" role="menu" style={style}>
      {items.map((item) =>
        item.href ? (
          <a key={item.label} role="menuitem" href={item.href} target="_blank" rel="noreferrer" onClick={onClose}>
            {item.label}
          </a>
        ) : (
          <button
            key={item.label}
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect?.();
            }}
          >
            {item.label}
            {item.hint && <small>{item.hint}</small>}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

export function ActionsCell({ value, getLinkedValue }: AgWidgetCustomCellRendererProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const id = Number(linked(getLinkedValue, 'invoices.id'));
  const payUrl = String(linked(getLinkedValue, 'invoices.payUrl') ?? '');

  const run = async (name: string, work: () => Promise<string>) => {
    setBusy(name);
    try {
      bridge.notify(await work());
      await bridge.refresh();
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setBusy(null);
    }
  };

  const work = {
    publish: async () => (await publishToPayPal(id), 'Invoice sent through PayPal'),
    sync: async () => (await syncWithPayPal(id)).outcome,
    draft: async () => {
      const d = await draftReminder(id);
      bridge.compose({ kind: 'reminder', invoice: d.invoice, to: d.to, subject: d.subject, body: d.body });
      return 'Reminder drafted. Nothing has been sent.';
    },
    markPaid: async () => (await markPaid(id)).outcome,
  };

  const ref = useCellClicks((action, target) => {
    if (busy) return;
    if (action === 'menu') setMenu((open) => (open ? null : target.getBoundingClientRect()));
    else if (action in work) void run(action, work[action as keyof typeof work]);
  });

  if (value === 'Done' || !id) return <span className="muted">Nothing to do</span>;

  const onHold = value === 'On hold';
  const items: MenuItem[] = [
    ...(onHold ? [] : [{ label: 'Draft a reminder', hint: 'AI writes it, you send it', onSelect: () => void run('draft', work.draft) }]),
    ...(payUrl ? [{ label: 'Open the pay link', href: payUrl }] : []),
    { label: 'Mark as paid by hand', hint: 'Not verified by PayPal', onSelect: () => void run('markPaid', work.markPaid) },
  ];

  return (
    <span className="cell-actions" ref={ref}>
      {onHold ? (
        <span className="muted" title="Chasing is paused until the dispute is resolved">On hold: disputed</span>
      ) : (
        <button
          className={`btn btn-small${busy ? ' is-busy' : ''}`}
          disabled={!!busy}
          data-action={value === 'Send via PayPal' ? 'publish' : 'sync'}
          title={value === 'Send via PayPal' ? 'Send this invoice to the customer through PayPal' : 'Ask PayPal whether this invoice has been paid'}
        >
          {busy && <span className="spinner" />}
          {value === 'Send via PayPal' ? 'Send' : 'Check'}
        </button>
      )}
      <button className="more" data-action="menu" aria-label="More actions" aria-haspopup="menu" aria-expanded={!!menu}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="11" cy="7" r="1.2" />
        </svg>
      </button>
      {menu && <Menu anchor={menu} items={items} onClose={() => setMenu(null)} />}
    </span>
  );
}

export function ReplyCell({ value, getLinkedValue }: AgWidgetCustomCellRendererProps) {
  const body = String(linked(getLinkedValue, 'replies.draftReply') ?? '');
  const to = String(linked(getLinkedValue, 'replies.customerEmail') ?? '');
  const invoice = String(linked(getLinkedValue, 'replies.invoiceNumber') ?? '');

  const ref = useCellClicks((action) => {
    if (action === 'reply') bridge.compose({ kind: 'reply', invoice, to, subject: `Re: Invoice ${invoice}`, body });
  });

  if (!body) return <span className="muted">{value === 'No draft' ? 'No draft' : 'Not read yet'}</span>;
  return (
    <span className="cell-actions" ref={ref}>
      <button className="btn btn-small" data-action="reply">
        Open draft reply
      </button>
    </span>
  );
}
