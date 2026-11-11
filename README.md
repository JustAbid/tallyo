# Tallyo

Tallyo is a dashboard for people who send invoices and then spend too much time wondering who has paid. It reads the replies customers send, writes a friendly follow-up for you to review, and asks PayPal whether the money actually arrived.

It was built for the PayPal AI Hackathon 2026. Everything runs against the PayPal Sandbox, so no real money moves.

## What it does

- **Shows where the money is.** Overdue, still to collect, and how late each dollar is, on an AG Studio dashboard with four pages: Overview, Invoices, Replies and Customers.
- **Reads customer replies.** "I'll pay Friday", "I already paid", "the total is wrong" and "can you resend that?" are each recognised. Gemini describes the message, and ordinary code decides what happens next.
- **Checks PayPal.** An invoice only counts as paid through PayPal when PayPal says so. A payment you record by hand is kept apart and labelled as such.
- **Drafts the reminder, then stops.** Each draft opens in an editor where you can change it, then open it in Gmail (or your mail app) with the recipient, subject and message already filled in. Tallyo never sends email itself.
- **Switches between light and dark.** A toggle in the header, with a "match my computer" option that is the default.
- **Answers questions in plain English.** Inside the dashboard, a chat agent can look things up, build widgets, draft reminders and check PayPal.

## How the decisions are made

The model reads and writes. It does not decide. When a customer says they already paid, Tallyo asks PayPal and reports what PayPal says, even if the customer sounds sure. A dispute pauses chasing for that invoice. A request for a payment plan goes to a person. Nothing the model returns can mark an invoice paid or change an amount. That logic lives in [`server/src/ai.ts`](server/src/ai.ts) and [`server/src/reconcile.ts`](server/src/reconcile.ts).

## Running it

You need Node.js 20.19+ or 22.12+.

1. Copy `.env.example` to `server/.env` and fill it in:
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a Sandbox app at [developer.paypal.com](https://developer.paypal.com). Switch on the **Invoicing** feature for that app.
   - `AI_API_KEY` from [Google AI Studio](https://aistudio.google.com). The free tier is enough.
   - `PAYPAL_WEBHOOK_ID` is optional (see below).
2. Put your AG Studio licence in `client/.env.local` as `VITE_AG_STUDIO_LICENSE=...`. A 45-day trial licence is free from AG Grid. Without a key Studio still runs locally, with a watermark.
3. Start the server:
   ```
   cd server
   npm install
   npm run dev
   ```
4. Start the client in a second terminal:
   ```
   cd client
   npm install
   npm run dev
   ```
5. Open http://localhost:5173.

On first start the server creates a SQLite file in `server/data/` and fills it with demo data: ten clients of a small design studio, 24 invoices and eight replies. `npm run seed` in `server/` resets it.

If a key is missing, the dashboard and demo data still load. The PayPal and AI buttons report what is missing instead of failing quietly.

### Automatic payment detection (optional)

Sync buttons work without this. For Tallyo to notice a payment on its own, PayPal needs a public address to call:

1. Start a tunnel to the server, for example `cloudflared tunnel --url http://localhost:3001`.
2. In the PayPal dashboard, open your Sandbox app, add a webhook pointing at `<tunnel address>/api/paypal/webhook`, and tick the Invoicing events.
3. Put the webhook ID in `server/.env` and restart the server.

Only the webhook route answers requests that arrive through a tunnel. Every other route returns 404 unless the request comes from localhost.

## How it is put together

```
client/               React, TypeScript, Vite
  src/studio/         AG Studio: data, report, theme, custom widget, cell renderers, agents
  src/components/     header mark, loading skeleton, email composer
server/               Node, Express, SQLite
  src/ai.ts           reads replies, drafts reminders, applies the safe outcomes
  src/paypal.ts       sandbox-only PayPal client (invoices, webhook verification)
  src/reconcile.ts    turns what PayPal reports into what Tallyo records
  src/llmProxy.ts     lets Studio's agents use Gemini without exposing the key
docs/                 submission text, checklist, design notes
```

### Where AG Studio is used

- The whole dashboard is one `AgStudio` component fed by three related tables (invoices, customers, replies) plus an aging table.
- **Who still owes you** is a custom widget that reads whatever fields the report maps to it, so filters apply to it like any built-in widget.
- The **Payment check** and **Action** columns are custom cell renderers inside Studio's table widget.
- The chat panel uses the Studio Agent Framework with a small adapter for Gemini and a custom `collections` agent that has three tools of its own.
- The theme, fonts, chart colours and the four-page report are set in code.

### Security notes

- API keys live in `.env` files that git ignores. The Gemini key never reaches the browser; Studio's agents call `/api/llm` on the server.
- Payment webhooks are checked against PayPal's signature, and the invoice is then read again from PayPal rather than trusted from the message.
- The AI endpoint allows 40 calls a minute so a runaway agent cannot use up a free quota.
- No card details touch Tallyo. Customers pay on PayPal's own page.

This is a hackathon demo, not a finished product. It has no user accounts, one SQLite file, and no inbox connection (the replies are sample messages). The free Gemini tier may use prompts to improve Google's products, so only demo data should go through it.

## Licence

MIT. See [LICENSE](LICENSE).
