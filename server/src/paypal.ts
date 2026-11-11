// Sandbox only. The base URL is fixed on purpose so this app can never touch real money.
const BASE = 'https://api-m.sandbox.paypal.com';

export class PayPalError extends Error {
  constructor(
    public status: number,
    message: string,
    public debugId?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function getToken(force = false) {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new PayPalError(500, 'PayPal keys are missing from server/.env');

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new PayPalError(res.status, 'PayPal rejected the sandbox keys');

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}, retried = false): Promise<T> {
  const token = await getToken(retried);
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (res.status === 401 && !retried) return request<T>(path, init, true);

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new PayPalError(res.status, data.message ?? data.name ?? `PayPal returned ${res.status}`, data.debug_id, data.details);
  }
  return data as T;
}

export interface PayPalInvoice {
  id: string;
  status: string;
  detail: { invoice_number: string; invoice_date: string; currency_code: string };
  amount?: { currency_code: string; value: string };
  due_amount?: { currency_code: string; value: string };
  payments?: {
    paid_amount?: { value: string };
    transactions?: {
      payment_id: string;
      type: 'PAYPAL' | 'EXTERNAL';
      method?: string;
      payment_date: string;
      amount: { value: string; currency_code: string };
    }[];
  };
  links?: { rel: string; href: string }[];
}

interface NewInvoice {
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  description: string;
}

const idFromHref = (href: string) => href.split('/').pop() as string;

export async function createAndSendInvoice(inv: NewInvoice) {
  const draft = await request<{ href: string }>('/v2/invoicing/invoices', {
    method: 'POST',
    body: {
      detail: {
        invoice_number: inv.number,
        invoice_date: inv.date,
        currency_code: inv.currency,
        note: 'Demo invoice created by Tallyo (PayPal sandbox).',
        payment_term: { term_type: 'DUE_ON_DATE_SPECIFIED', due_date: inv.dueDate },
      },
      primary_recipients: [
        { billing_info: { business_name: inv.customerName, email_address: inv.customerEmail } },
      ],
      items: [
        {
          name: inv.description,
          quantity: '1',
          unit_amount: { currency_code: inv.currency, value: inv.amount.toFixed(2) },
        },
      ],
      configuration: { allow_tip: false, tax_inclusive: false },
    },
  });

  const paypalId = idFromHref(draft.href);
  const sent = await request<{ href?: string }>(`/v2/invoicing/invoices/${paypalId}/send`, {
    method: 'POST',
    body: { send_to_recipient: true, send_to_invoicer: false },
  });

  return { paypalId, payUrl: sent.href ?? null };
}

export const getInvoice = (paypalId: string) => request<PayPalInvoice>(`/v2/invoicing/invoices/${paypalId}`);

export const cancelInvoice = (paypalId: string) =>
  request<unknown>(`/v2/invoicing/invoices/${paypalId}/cancel`, {
    method: 'POST',
    body: { send_to_invoicer: false, send_to_recipient: false },
  });

export const listPayPalInvoices = (pageSize = 20) =>
  request<{ total_items: number; items?: PayPalInvoice[] }>(
    `/v2/invoicing/invoices?page=1&page_size=${pageSize}&total_required=true`,
  );

export async function verifyWebhook(headers: Record<string, string | string[] | undefined>, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const h = (name: string) => String(headers[name] ?? '');

  const result = await request<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return result.verification_status === 'SUCCESS';
}
