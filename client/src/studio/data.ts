import type { Customer, Invoice, Reply } from '../api';

const money = { format: 'currencyFormat', formatOptions: { format: '$#,##0' } } as const;

const intentLabels: Record<string, string> = {
  promise_to_pay: 'Promised to pay',
  claims_paid: 'Says already paid',
  dispute: 'Disputes amount',
  resend_request: 'Wants invoice resent',
  payment_plan_request: 'Wants a payment plan',
  other: 'Needs a person',
};

const buckets = ['Current', 'Late 1-30 days', 'Late 31-60 days', 'Late 61-90 days', 'Late 90+ days'];

// Unpaid money by age. Built here so the aging chart never counts invoices that are already paid.
function agingRows(invoices: Invoice[]) {
  return buckets.map((bucket) => {
    const open = invoices.filter((i) => i.status !== 'paid' && i.agingBucket === bucket);
    return { bucket, amount: Math.round(open.reduce((n, i) => n + i.amount * 100, 0)) / 100, invoices: open.length };
  });
}

export function buildStudioData(invoices: Invoice[], customers: Customer[], replies: Reply[]) {
  return {
    sources: [
      {
        id: 'aging',
        name: 'Aging',
        description: 'Unpaid invoices grouped by how late they are. Paid invoices are not counted.',
        primaryKeyField: 'bucket',
        data: agingRows(invoices),
        fields: [
          { id: 'bucket', name: 'Age', format: 'textFormat' },
          { id: 'amount', name: 'Unpaid amount', ...money },
          { id: 'invoices', name: 'Unpaid invoices', format: 'integerFormat' },
        ],
      },
      {
        id: 'invoices',
        name: 'Invoices',
        description: 'One row per invoice. Overdue amounts are unpaid invoices past their due date.',
        primaryKeyField: 'id',
        data: invoices.map((i) => ({
          ...i,
          lastReplyIntent: i.lastReplyIntent === 'none' ? 'No reply' : (intentLabels[i.lastReplyIntent] ?? i.lastReplyIntent),
          paidAt: i.paidAt ?? undefined,
          promisedDate: i.promisedDate ?? undefined,
          paypalInvoiceId: i.paypalInvoiceId ?? '',
          payUrl: i.payUrl ?? '',
        })),
        fields: [
          { id: 'id', format: 'integerFormat', hide: true },
          { id: 'customerId', format: 'integerFormat', hide: true },
          { id: 'number', name: 'Invoice', format: 'textFormat' },
          { id: 'customer', name: 'Customer', format: 'textFormat' },
          { id: 'amount', name: 'Amount', format: 'currencyFormat', formatOptions: { format: '$#,##0.00' } },
          { id: 'currency', format: 'textFormat', hide: true },
          { id: 'issuedAt', name: 'Issued', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'dueAt', name: 'Due', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'status', name: 'Status', format: 'textFormat' },
          { id: 'paidAt', name: 'Paid on', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'verification', name: 'Payment check', format: 'textFormat', context: { cellRenderer: 'verification' } },
          { id: 'promisedDate', name: 'Promised for', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'lastReplyIntent', name: 'Last reply', format: 'textFormat' },
          { id: 'daysOverdue', name: 'Days overdue', format: 'integerFormat' },
          { id: 'agingBucket', name: 'Aging bucket', format: 'textFormat' },
          { id: 'paypalInvoiceId', format: 'textFormat', hide: true },
          { id: 'payUrl', format: 'textFormat', hide: true },
          {
            id: 'nextAction',
            name: 'Action',
            format: 'textFormat',
            context: {
              cellRenderer: 'actions',
              linkedFields: [
                { id: 'invoices.id', aggregation: 'first' },
                { id: 'invoices.payUrl', aggregation: 'first' },
                { id: 'invoices.status', aggregation: 'first' },
              ],
            },
          },
        ],
      },
      {
        id: 'customers',
        name: 'Customers',
        description: 'One row per customer with their totals.',
        primaryKeyField: 'id',
        data: customers,
        fields: [
          { id: 'id', format: 'integerFormat', hide: true },
          { id: 'name', name: 'Customer', format: 'textFormat' },
          { id: 'email', name: 'Email', format: 'textFormat' },
          { id: 'invoiceCount', name: 'Invoices', format: 'integerFormat' },
          { id: 'totalBilled', name: 'Total billed', ...money },
          { id: 'outstanding', name: 'Outstanding', ...money },
          { id: 'overdue', name: 'Overdue', ...money },
          { id: 'avgDaysOverdue', name: 'Avg days overdue', format: 'integerFormat' },
        ],
      },
      {
        id: 'replies',
        name: 'Customer replies',
        description: 'Messages customers sent back about an invoice, with what the AI understood from each.',
        primaryKeyField: 'id',
        data: replies.map((r) => ({
          ...r,
          intent: r.intent ? (intentLabels[r.intent] ?? r.intent) : 'Not read yet',
          promisedDate: r.promisedDate ?? undefined,
          summary: r.summary ?? '',
          actionTaken: r.actionTaken ?? '',
          draftReply: r.draftReply ?? '',
          replyAction: r.draftReply ? 'Draft ready' : r.intent ? 'No draft' : 'Not read yet',
        })),
        fields: [
          { id: 'id', format: 'integerFormat', hide: true },
          { id: 'invoiceId', format: 'integerFormat', hide: true },
          { id: 'invoiceNumber', name: 'Invoice', format: 'textFormat' },
          { id: 'customer', name: 'Customer', format: 'textFormat' },
          { id: 'receivedAt', name: 'Received', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'body', name: 'Message', format: 'textFormat' },
          { id: 'intent', name: 'What it means', format: 'textFormat' },
          { id: 'promisedDate', name: 'Promised for', format: 'dateFormat', formatOptions: { format: 'dd mmm yyyy' } },
          { id: 'summary', name: 'Summary', format: 'textFormat' },
          { id: 'actionTaken', name: 'What Tallyo did', format: 'textFormat' },
          { id: 'draftReply', name: 'Draft reply', format: 'textFormat' },
          { id: 'customerEmail', format: 'textFormat', hide: true },
          {
            id: 'replyAction',
            name: 'Reply',
            format: 'textFormat',
            context: {
              cellRenderer: 'reply',
              linkedFields: [
                { id: 'replies.draftReply', aggregation: 'first' },
                { id: 'replies.customerEmail', aggregation: 'first' },
                { id: 'replies.invoiceNumber', aggregation: 'first' },
                { id: 'replies.id', aggregation: 'first' },
              ],
            },
          },
        ],
      },
    ],
    relationships: [
      { id: 'invoices-customers', source: 'invoices.customerId', target: 'customers.id', type: 'many-to-one' },
      { id: 'replies-invoices', source: 'replies.invoiceId', target: 'invoices.id', type: 'many-to-one' },
    ],
  };
}
