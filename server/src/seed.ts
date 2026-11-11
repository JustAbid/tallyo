import { db } from './db';

// Demo data only. Dates are relative to today so the aging buckets always look realistic.
const customers = [
  ['Acme Studio', 'billing@acme-studio.example'],
  ['Northwind Traders', 'accounts@northwind.example'],
  ['Globex Corp', 'ap@globex.example'],
  ['Initech', 'finance@initech.example'],
  ['Umbrella Design', 'hello@umbrella-design.example'],
  ['Stark Labs', 'payables@stark-labs.example'],
  ['Wayne Consulting', 'office@wayne-consulting.example'],
  ['Hooli Media', 'invoices@hooli-media.example'],
  ['Pied Piper Co', 'team@piedpiper.example'],
  ['Soylent Foods', 'books@soylent.example'],
] as const;

type Status = 'open' | 'promised' | 'disputed' | 'paid';

interface InvoiceSeed {
  customer: number; // index into customers
  amount: number;
  issued: number; // days ago
  terms: number; // payment terms in days
  status?: Status;
  paidVia?: 'paypal' | 'manual';
  paidAgo?: number;
  promisedIn?: number; // days from today, negative if already missed
}

const invoices: InvoiceSeed[] = [
  { customer: 0, amount: 1200, issued: 60, terms: 30 },
  { customer: 0, amount: 850, issued: 20, terms: 30 },
  { customer: 0, amount: 2400, issued: 120, terms: 30, status: 'paid', paidVia: 'paypal', paidAgo: 80 },
  { customer: 1, amount: 450, issued: 40, terms: 30, status: 'promised', promisedIn: 2 },
  { customer: 1, amount: 1320, issued: 95, terms: 30 },
  { customer: 1, amount: 600, issued: 150, terms: 30, status: 'paid', paidVia: 'paypal', paidAgo: 115 },
  { customer: 2, amount: 980, issued: 45, terms: 30, status: 'paid', paidVia: 'paypal', paidAgo: 12 },
  { customer: 2, amount: 1750, issued: 15, terms: 14 },
  { customer: 2, amount: 400, issued: 70, terms: 30, status: 'paid', paidVia: 'manual', paidAgo: 25 },
  { customer: 3, amount: 300, issued: 110, terms: 30 },
  { customer: 3, amount: 3200, issued: 200, terms: 30, status: 'disputed' },
  { customer: 4, amount: 720, issued: 52, terms: 30, status: 'promised', promisedIn: -2 },
  { customer: 4, amount: 1500, issued: 10, terms: 30 },
  { customer: 4, amount: 540, issued: 100, terms: 30, status: 'paid', paidVia: 'paypal', paidAgo: 60 },
  { customer: 5, amount: 8800, issued: 38, terms: 30 },
  { customer: 5, amount: 4200, issued: 75, terms: 30, status: 'paid', paidVia: 'paypal', paidAgo: 40 },
  { customer: 5, amount: 2900, issued: 5, terms: 30 },
  { customer: 6, amount: 1100, issued: 33, terms: 15 },
  { customer: 6, amount: 650, issued: 90, terms: 30 },
  { customer: 7, amount: 2050, issued: 62, terms: 30 },
  { customer: 7, amount: 780, issued: 25, terms: 30, status: 'paid', paidVia: 'manual', paidAgo: 3 },
  { customer: 8, amount: 1900, issued: 48, terms: 30 },
  { customer: 9, amount: 360, issued: 35, terms: 30 },
  { customer: 9, amount: 940, issued: 130, terms: 30 },
];

// invoice: 1-based position in the list above
const replies = [
  { invoice: 4, ago: 1, body: "Thanks for the reminder. I'll get this paid in the next couple of days.", intent: 'promise_to_pay', promisedIn: 2 },
  { invoice: 10, ago: 2, body: 'I already paid this last week through PayPal.', intent: 'claims_paid' },
  { invoice: 11, ago: 6, body: 'The total is wrong. We agreed on 2,700, not 3,200.', intent: 'dispute' },
  { invoice: 12, ago: 4, body: 'I will pay this in two days.', intent: 'promise_to_pay', promisedIn: -2 },
  { invoice: 18, ago: 1, body: "Could you resend the invoice? I can't find the original email.", intent: 'resend_request' },
  // left unclassified on purpose so the AI has something to read in the demo
  { invoice: 1, ago: 0, body: "We're a bit tight this month. Could we split this into two payments?" },
  { invoice: 20, ago: 0, body: 'Paid yesterday, please check.' },
  { invoice: 22, ago: 0, body: "Was this the invoice for the March retainer? I'll pay once you confirm." },
] as const;

const dayOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function resetAndSeed() {
  db.transaction(() => {
    for (const table of ['events', 'replies', 'payments', 'invoices', 'customers']) {
      db.exec(`DELETE FROM ${table}`);
    }

    const addCustomer = db.prepare('INSERT INTO customers (name, email) VALUES (?, ?)');
    const customerIds = customers.map(([name, email]) => Number(addCustomer.run(name, email).lastInsertRowid));

    const addInvoice = db.prepare(`
      INSERT INTO invoices (number, customer_id, amount_cents, issued_at, due_at, status, paid_at, paid_via, promised_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const addPayment = db.prepare(
      'INSERT INTO payments (invoice_id, paypal_txn_id, amount_cents, paid_at, payer_email) VALUES (?, ?, ?, ?, ?)',
    );
    const addEvent = db.prepare('INSERT INTO events (invoice_id, at, kind, detail) VALUES (?, ?, ?, ?)');

    const invoiceIds: number[] = [];
    invoices.forEach((inv, i) => {
      const issuedAt = dayOffset(-inv.issued);
      const dueAt = dayOffset(-inv.issued + inv.terms);
      const status = inv.status ?? 'open';
      const paidAt = inv.paidAgo !== undefined ? dayOffset(-inv.paidAgo) : null;
      const promised = inv.promisedIn !== undefined ? dayOffset(inv.promisedIn) : null;
      const cents = inv.amount * 100;

      const id = Number(
        addInvoice.run(`INV-${1001 + i}`, customerIds[inv.customer], cents, issuedAt, dueAt, status, paidAt, inv.paidVia ?? null, promised)
          .lastInsertRowid,
      );
      invoiceIds.push(id);

      if (inv.paidVia === 'paypal' && paidAt) {
        addPayment.run(id, `DEMO-TXN-${1001 + i}`, cents, paidAt, customers[inv.customer][1]);
        addEvent.run(id, paidAt, 'payment_verified', 'Matched a PayPal transaction to this invoice');
      } else if (inv.paidVia === 'manual' && paidAt) {
        addEvent.run(id, paidAt, 'marked_paid', 'Marked as paid by the business owner');
      }

      if (status !== 'paid' && inv.issued > inv.terms + 3) {
        addEvent.run(id, dayOffset(-inv.issued + inv.terms + 3), 'reminder_sent', 'First reminder sent');
      }
    });

    const addReply = db.prepare('INSERT INTO replies (invoice_id, received_at, body, intent, promised_date) VALUES (?, ?, ?, ?, ?)');
    for (const r of replies) {
      addReply.run(
        invoiceIds[r.invoice - 1],
        dayOffset(-r.ago),
        r.body,
        'intent' in r ? r.intent : null,
        'promisedIn' in r ? dayOffset(r.promisedIn) : null,
      );
    }
  })();
}

export function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM invoices').get() as { n: number };
  if (n === 0) resetAndSeed();
}
