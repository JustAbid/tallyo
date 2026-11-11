import { db } from './db';
import { getInvoice, type PayPalInvoice } from './paypal';

interface LocalInvoice {
  id: number;
  status: string;
  paid_via: string | null;
  paypal_invoice_id: string | null;
}

const addEvent = (invoiceId: number, kind: string, detail: string) =>
  db.prepare('INSERT INTO events (invoice_id, at, kind, detail) VALUES (?, ?, ?, ?)').run(
    invoiceId,
    new Date().toISOString(),
    kind,
    detail,
  );

export function findLocalByPayPalId(paypalId: string) {
  return db.prepare('SELECT id, status, paid_via, paypal_invoice_id FROM invoices WHERE paypal_invoice_id = ?').get(paypalId) as
    | LocalInvoice
    | undefined;
}

/**
 * Compares what PayPal says about an invoice with our own record and updates ours.
 * A payment only counts as "PayPal verified" when PayPal itself reports a transaction
 * of type PAYPAL. Payments recorded by hand (EXTERNAL) are kept as "manual".
 * Safe to call repeatedly, so webhook retries don't create duplicates.
 */
export function applyPayPalInvoice(localId: number, pp: PayPalInvoice) {
  const local = db.prepare('SELECT id, status, paid_via, paypal_invoice_id FROM invoices WHERE id = ?').get(localId) as
    | LocalInvoice
    | undefined;
  if (!local) throw new Error(`No invoice with id ${localId}`);

  const transactions = pp.payments?.transactions ?? [];
  const viaPayPal = transactions.filter((t) => t.type === 'PAYPAL');
  const external = transactions.filter((t) => t.type === 'EXTERNAL');

  let outcome = `PayPal status ${pp.status}, nothing to change`;

  if (pp.status === 'PAID' || pp.status === 'MARKED_AS_PAID') {
    const verified = viaPayPal.length > 0;
    const txn = (verified ? viaPayPal : external)[0];
    const paidAt = (txn?.payment_date ?? new Date().toISOString()).slice(0, 10);
    const alreadyDone = local.status === 'paid' && local.paid_via === (verified ? 'paypal' : 'manual');

    if (!alreadyDone) {
      db.transaction(() => {
        db.prepare("UPDATE invoices SET status = 'paid', paid_at = ?, paid_via = ?, promised_date = NULL WHERE id = ?").run(
          paidAt,
          verified ? 'paypal' : 'manual',
          local.id,
        );
        if (verified) {
          const known = db.prepare('SELECT 1 FROM payments WHERE paypal_txn_id = ?').get(txn.payment_id);
          if (!known) {
            db.prepare('INSERT INTO payments (invoice_id, paypal_txn_id, amount_cents, paid_at) VALUES (?, ?, ?, ?)').run(
              local.id,
              txn.payment_id,
              Math.round(Number(txn.amount.value) * 100),
              paidAt,
            );
          }
          addEvent(local.id, 'payment_verified', `PayPal reported payment ${txn.payment_id}`);
        } else {
          addEvent(local.id, 'marked_paid', 'PayPal shows this invoice as marked paid (recorded outside PayPal)');
        }
      })();
      outcome = verified ? 'Payment verified through PayPal' : 'Marked paid, not verified through PayPal';
    } else {
      outcome = 'Already up to date';
    }
  } else if (pp.status === 'PARTIALLY_PAID') {
    outcome = `Partially paid (${pp.payments?.paid_amount?.value ?? '?'} received)`;
    addEvent(local.id, 'partial_payment', outcome);
  } else if (pp.status === 'CANCELLED') {
    outcome = 'PayPal invoice was cancelled';
    addEvent(local.id, 'paypal_cancelled', outcome);
  }

  return { invoiceId: local.id, paypalStatus: pp.status, outcome };
}

export async function syncInvoice(localId: number) {
  const row = db.prepare('SELECT paypal_invoice_id FROM invoices WHERE id = ?').get(localId) as
    | { paypal_invoice_id: string | null }
    | undefined;
  if (!row) throw new Error(`No invoice with id ${localId}`);
  if (!row.paypal_invoice_id) throw new Error('This invoice has not been published to PayPal yet');
  return applyPayPalInvoice(localId, await getInvoice(row.paypal_invoice_id));
}

export function markPaidManually(localId: number) {
  const row = db.prepare('SELECT status FROM invoices WHERE id = ?').get(localId) as { status: string } | undefined;
  if (!row) throw new Error(`No invoice with id ${localId}`);
  if (row.status === 'paid') return { invoiceId: localId, outcome: 'Already paid' };

  db.prepare("UPDATE invoices SET status = 'paid', paid_via = 'manual', paid_at = ?, promised_date = NULL WHERE id = ?").run(
    new Date().toISOString().slice(0, 10),
    localId,
  );
  addEvent(localId, 'marked_paid', 'Marked as paid by the business owner');
  return { invoiceId: localId, outcome: 'Marked paid manually (not verified through PayPal)' };
}
