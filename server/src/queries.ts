import { db } from './db';

const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

const daysBetween = (from: string, to: number) => Math.round((to - Date.parse(from)) / DAY);

// These labels sort correctly in alphabetical order, which is how charts order them.
export type AgingBucket = 'Current' | 'Late 1-30 days' | 'Late 31-60 days' | 'Late 61-90 days' | 'Late 90+ days' | 'Paid';

function bucketFor(status: string, daysOverdue: number): AgingBucket {
  if (status === 'paid') return 'Paid';
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return 'Late 1-30 days';
  if (daysOverdue <= 60) return 'Late 31-60 days';
  if (daysOverdue <= 90) return 'Late 61-90 days';
  return 'Late 90+ days';
}

interface InvoiceRow {
  id: number;
  number: string;
  customer_id: number;
  customer: string;
  amount_cents: number;
  currency: string;
  issued_at: string;
  due_at: string;
  status: string;
  paid_at: string | null;
  paid_via: 'paypal' | 'manual' | null;
  promised_date: string | null;
  paypal_invoice_id: string | null;
  paypal_pay_url: string | null;
  last_intent: string | null;
}

function nextActionFor(row: InvoiceRow) {
  if (row.status === 'paid') return 'Done';
  if (row.status === 'disputed') return 'On hold';
  return row.paypal_invoice_id ? 'Check PayPal' : 'Send via PayPal';
}

export function listInvoices() {
  const rows = db
    .prepare(
      `SELECT i.*, c.name AS customer,
         (SELECT r.intent FROM replies r WHERE r.invoice_id = i.id ORDER BY r.received_at DESC, r.id DESC LIMIT 1) AS last_intent
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       ORDER BY i.due_at`,
    )
    .all() as InvoiceRow[];

  const today = startOfToday();
  return rows.map((r) => {
    const daysOverdue = r.status === 'paid' ? 0 : Math.max(0, daysBetween(r.due_at, today));
    const verification =
      r.paid_via === 'paypal' ? 'PayPal verified' : r.paid_via === 'manual' ? 'Marked paid manually' : 'Unpaid';
    return {
      id: r.id,
      number: r.number,
      customerId: r.customer_id,
      customer: r.customer,
      amount: r.amount_cents / 100,
      currency: r.currency,
      issuedAt: r.issued_at,
      dueAt: r.due_at,
      status: r.status,
      paidAt: r.paid_at,
      verification,
      promisedDate: r.promised_date,
      lastReplyIntent: r.last_intent ?? 'none',
      paypalInvoiceId: r.paypal_invoice_id,
      payUrl: r.paypal_pay_url,
      nextAction: nextActionFor(r),
      daysOverdue,
      agingBucket: bucketFor(r.status, daysBetween(r.due_at, today)),
    };
  });
}

export function listCustomers() {
  const invoices = listInvoices();
  const customers = db.prepare('SELECT id, name, email FROM customers ORDER BY name').all() as {
    id: number;
    name: string;
    email: string;
  }[];

  return customers.map((c) => {
    const mine = invoices.filter((i) => i.customerId === c.id);
    const unpaid = mine.filter((i) => i.status !== 'paid');
    const late = mine.filter((i) => i.daysOverdue > 0);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      invoiceCount: mine.length,
      totalBilled: sum(mine.map((i) => i.amount)),
      outstanding: sum(unpaid.map((i) => i.amount)),
      overdue: sum(late.map((i) => i.amount)),
      avgDaysOverdue: late.length ? Math.round(sum(late.map((i) => i.daysOverdue)) / late.length) : 0,
    };
  });
}

export function listReplies() {
  return db
    .prepare(
      `SELECT r.id, r.invoice_id AS invoiceId, i.number AS invoiceNumber, c.name AS customer,
              r.received_at AS receivedAt, r.body, r.intent, r.promised_date AS promisedDate
       FROM replies r
       JOIN invoices i ON i.id = r.invoice_id
       JOIN customers c ON c.id = i.customer_id
       ORDER BY r.received_at DESC, r.id DESC`,
    )
    .all();
}

export function getSummary() {
  const invoices = listInvoices();
  const unpaid = invoices.filter((i) => i.status !== 'paid');
  const buckets: Record<string, { count: number; amount: number }> = {};
  for (const i of unpaid) {
    const b = (buckets[i.agingBucket] ??= { count: 0, amount: 0 });
    b.count += 1;
    b.amount += i.amount;
  }
  const paid = invoices.filter((i) => i.status === 'paid');
  return {
    outstanding: sum(unpaid.map((i) => i.amount)),
    overdue: sum(unpaid.filter((i) => i.daysOverdue > 0).map((i) => i.amount)),
    paidTotal: sum(paid.map((i) => i.amount)),
    paypalVerifiedCount: paid.filter((i) => i.verification === 'PayPal verified').length,
    manualCount: paid.filter((i) => i.verification === 'Marked paid manually').length,
    unclassifiedReplies: (db.prepare('SELECT COUNT(*) AS n FROM replies WHERE intent IS NULL').get() as { n: number }).n,
    buckets,
  };
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
