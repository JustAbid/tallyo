import type { Customer, Invoice, Reply } from '../api';

const money = { format: 'currencyFormat', formatOptions: { format: '$#,##0' } } as const;

const intentLabels: Record<string, string> = {
  promise_to_pay: 'Promised to pay',
  claims_paid: 'Says already paid',
  dispute: 'Disputes amount',
  resend_request: 'Wants invoice resent',
};

export function buildStudioData(invoices: Invoice[], customers: Customer[], replies: Reply[]) {
  return {
    sources: [
      {
        id: 'invoices',
        name: 'Invoices',
        description: 'One row per invoice. Overdue amounts are unpaid invoices past their due date.',
        primaryKeyField: 'id',
        data: invoices.map((i) => ({
          ...i,
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
          { id: 'amount', name: 'Amount', ...money },
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
        ],
      },
    ],
    relationships: [
      { id: 'invoices-customers', source: 'invoices.customerId', target: 'customers.id', type: 'many-to-one' },
      { id: 'replies-invoices', source: 'replies.invoiceId', target: 'invoices.id', type: 'many-to-one' },
    ],
  };
}
