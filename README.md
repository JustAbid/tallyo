# Tallyo

Tallyo helps freelancers and small businesses chase overdue invoices. It reads customer replies ("I'll pay Friday", "I already paid"), tracks promises, and checks PayPal to see whether the money actually arrived.

Built for the PayPal AI Hackathon 2026. It only uses the PayPal Sandbox, so no real money is involved.

## Running it

You need Node.js 20.19+ or 22.12+.

1. Copy `.env.example` to `server/.env` and fill in your own keys. Put your AG Studio licence in `client/.env.local` as `VITE_AG_STUDIO_LICENSE=...` (AG Studio also runs without one, with a watermark).
2. Start the server:
   ```
   cd server
   npm install
   npm run dev
   ```
3. In a second terminal, start the client:
   ```
   cd client
   npm install
   npm run dev
   ```
4. Open http://localhost:5173

The server runs on port 3001. On first start it creates a local SQLite database in `server/data/` and fills it with demo data. To reset the demo data, run `npm run seed` in the `server` folder.

API routes: `/api/invoices`, `/api/customers`, `/api/replies`, `/api/summary`, plus PayPal routes under `/api/paypal` (publish an invoice, sync its status, receive webhooks). Everything talks to the PayPal Sandbox only.

## Stack

React, TypeScript, Vite, AG Grid, Node.js, Express, SQLite, PayPal Sandbox, Gemini.

## Licence

MIT
