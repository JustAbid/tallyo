export interface Invoice {
  id: number;
  number: string;
  customerId: number;
  customer: string;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  status: string;
  paidAt: string | null;
  verification: string;
  promisedDate: string | null;
  lastReplyIntent: string;
  paypalInvoiceId: string | null;
  payUrl: string | null;
  nextAction: string;
  daysOverdue: number;
  agingBucket: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  invoiceCount: number;
  totalBilled: number;
  outstanding: number;
  overdue: number;
  avgDaysOverdue: number;
}

export interface Reply {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customer: string;
  receivedAt: string;
  body: string;
  intent: string | null;
  promisedDate: string | null;
}

async function request<T>(path: string, method = 'GET'): Promise<T> {
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export async function loadAll() {
  const [invoices, customers, replies] = await Promise.all([
    request<Invoice[]>('/api/invoices'),
    request<Customer[]>('/api/customers'),
    request<Reply[]>('/api/replies'),
  ]);
  return { invoices, customers, replies };
}

export const publishToPayPal = (id: number) =>
  request<{ paypalInvoiceId: string; payUrl: string }>(`/api/paypal/invoices/${id}/publish`, 'POST');
export const syncWithPayPal = (id: number) => request<{ outcome: string }>(`/api/paypal/invoices/${id}/sync`, 'POST');
export const markPaid = (id: number) => request<{ outcome: string }>(`/api/paypal/invoices/${id}/mark-paid`, 'POST');
export const resetDemo = () => request<{ ok: boolean }>('/api/demo/reset', 'POST');
