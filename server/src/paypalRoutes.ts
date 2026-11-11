import express, { type Request, type Response } from 'express';
import { db } from './db';
import { createAndSendInvoice, getInvoice, listPayPalInvoices, paypalConfigured, PayPalError, verifyWebhook } from './paypal';
import { applyPayPalInvoice, findLocalByPayPalId, markPaidManually, syncInvoice } from './reconcile';

export const paypalRouter = express.Router();

function fail(res: Response, e: unknown) {
  if (e instanceof PayPalError) {
    return res.status(e.status === 403 ? 502 : e.status).json({ error: e.message, paypalStatus: e.status, debugId: e.debugId });
  }
  return res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
}

paypalRouter.get('/status', async (_req, res) => {
  const status = {
    keysPresent: paypalConfigured(),
    webhookIdPresent: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    invoicing: 'unknown' as 'ok' | 'not-enabled' | 'unknown',
  };
  if (status.keysPresent) {
    try {
      await listPayPalInvoices(1);
      status.invoicing = 'ok';
    } catch (e) {
      if (e instanceof PayPalError && e.status === 403) status.invoicing = 'not-enabled';
    }
  }
  res.json(status);
});

// Create the invoice in PayPal and send it. The email can be overridden so a sandbox buyer can pay it.
paypalRouter.post('/invoices/:id/publish', express.json(), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const row = db
      .prepare(
        `SELECT i.*, c.name AS customer_name, c.email AS customer_email
         FROM invoices i JOIN customers c ON c.id = i.customer_id WHERE i.id = ?`,
      )
      .get(id) as
      | {
          number: string;
          issued_at: string;
          due_at: string;
          amount_cents: number;
          currency: string;
          customer_name: string;
          customer_email: string;
          status: string;
          paypal_invoice_id: string | null;
        }
      | undefined;
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    if (row.paypal_invoice_id) return res.status(409).json({ error: 'Already published to PayPal' });
    if (row.status === 'paid') return res.status(409).json({ error: 'Invoice is already paid' });

    const today = new Date().toISOString().slice(0, 10);
    const { paypalId, payUrl } = await createAndSendInvoice({
      number: row.number,
      date: row.issued_at,
      dueDate: row.due_at < today ? today : row.due_at,
      amount: row.amount_cents / 100,
      currency: row.currency,
      customerName: row.customer_name,
      customerEmail: String(req.body?.email || row.customer_email),
      description: `Invoice ${row.number}`,
    });

    db.prepare('UPDATE invoices SET paypal_invoice_id = ?, paypal_pay_url = ? WHERE id = ?').run(paypalId, payUrl, id);
    db.prepare('INSERT INTO events (invoice_id, at, kind, detail) VALUES (?, ?, ?, ?)').run(
      id,
      new Date().toISOString(),
      'paypal_published',
      `Sent as PayPal invoice ${paypalId}`,
    );
    res.json({ paypalInvoiceId: paypalId, payUrl });
  } catch (e) {
    fail(res, e);
  }
});

paypalRouter.post('/invoices/:id/sync', async (req, res) => {
  try {
    res.json(await syncInvoice(Number(req.params.id)));
  } catch (e) {
    fail(res, e);
  }
});

paypalRouter.post('/invoices/:id/mark-paid', (req, res) => {
  try {
    res.json(markPaidManually(Number(req.params.id)));
  } catch (e) {
    fail(res, e);
  }
});

// Needs the raw request body, so index.ts mounts this before express.json().
export async function webhookHandler(req: Request, res: Response) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return res.status(503).json({ error: 'PAYPAL_WEBHOOK_ID is not set, so events cannot be verified' });
  }

  let event: { event_type?: string; resource?: { id?: string; invoice?: { id?: string } } };
  try {
    event = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch {
    return res.status(400).json({ error: 'Body is not valid JSON' });
  }

  try {
    if (!(await verifyWebhook(req.headers, event))) {
      return res.status(401).json({ error: 'Signature check failed' });
    }
  } catch (e) {
    return fail(res, e);
  }

  // Acknowledge first; PayPal retries if we are slow.
  res.status(200).json({ received: true });

  const type = event.event_type ?? '';
  if (!type.startsWith('INVOICING.INVOICE.')) return;
  const paypalId = event.resource?.invoice?.id ?? event.resource?.id;
  const local = paypalId ? findLocalByPayPalId(paypalId) : undefined;
  if (!paypalId || !local) return;

  try {
    // Re-read the invoice from PayPal instead of trusting the event payload.
    const result = applyPayPalInvoice(local.id, await getInvoice(paypalId));
    console.log(`Webhook ${type}: ${result.outcome}`);
  } catch (e) {
    console.error('Webhook processing failed:', e);
  }
}
