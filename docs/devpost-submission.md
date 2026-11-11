# Devpost submission text

Paste each section into the matching Devpost field. Edit anything that does not sound like you. Fill in the bracketed parts before submitting.

## Project name

Tallyo

## Tagline (one line)

Reads replies to overdue invoices, drafts the follow-up, and checks PayPal to see if the money really arrived.

## Inspiration

Chasing a late invoice is a small job that eats a lot of time. You send a reminder, the customer says "I'll pay next week", you note it somewhere, and a week later you have to check three places to learn whether anything happened. Some customers say they paid when they have not. Some dispute the amount and need a human, and a template reminder only makes that worse.

I wanted something that handles the reading and the checking and leaves the decisions to the person who owns the invoice.

## What it does

Tallyo is an overdue-invoice dashboard built around PayPal.

- It lists every invoice with how late it is, and shows whether each payment was confirmed by PayPal or only marked as paid by hand. The two are never mixed up.
- It reads customer replies. "I'll pay in two days" becomes a recorded promise with a date. "I already paid" triggers a real PayPal check. "The total is wrong" pauses chasing and flags the invoice for a person. A request for a payment plan goes to the owner, because that is not a decision for software.
- It drafts a friendly reminder or reply for each case. The draft opens in an editor, and one click opens it in Gmail with the recipient, subject and message filled in. There is also a mail-app button and a copy button. Tallyo never sends an email itself.
- It has a chat agent inside the dashboard that can answer questions about the data, build widgets, draft reminders and check PayPal.

## How I built it

**PayPal.** Invoices are created and sent through the PayPal Invoicing API in the Sandbox. Payments are detected two ways: a webhook (checked against PayPal's signature) and a manual sync. Either way the invoice is read again from PayPal before anything is recorded, and a payment only counts as verified when PayPal reports a transaction made through PayPal. The first real sandbox payment came through as transaction `3HM332007H672874A`.

**AI.** Gemini does two jobs. One is reading a customer reply and returning structured JSON (what the customer wants, any promised date, a one-line summary, a draft answer). The other is powering the chat agents. The model only describes. Plain code in `server/src/ai.ts` decides what happens, so a confusing or hostile message cannot mark an invoice paid or change an amount. The Gemini key stays on the server.

**AG Studio.** The dashboard is a single AG Studio component fed by related tables. I wrote a custom widget ("Who still owes you"), custom cell renderers for the payment check and action columns, a theme, and a four-page report. For the Agent Framework I wrote an adapter that sends each turn through my own server to Gemini, and added a `collections` agent with three tools of its own (read new replies, draft a reminder, check PayPal) next to Studio's built-in agents.

**The rest.** React, TypeScript and Vite on the front, Node, Express and SQLite behind it. IBM Plex fonts are self-hosted.

## Challenges

- **The model invented data.** My first version of the chat agent answered "who is always late?" with customer names and amounts that did not exist. A helper agent's data lookup had failed, and the lead agent filled the gap. The cause was that the small model passed a tool argument in the wrong shape. A stronger model for the agents fixed the lookup, and the lead agent is now told to say so when a helper fails instead of guessing.
- **Gemini 3 tool-call signatures.** The API insists on a "thought signature" for every earlier tool call, and some calls in Studio's history do not have one stored. I send Google's documented placeholder in those cases.
- **A node-native database crashed on my Node version.** `better-sqlite3` 13 died with an access violation on Node 22.11, so the project uses version 12, which also works on a wider range of Node versions.
- **Draft quality.** Early reminder drafts declined a payment plan on the owner's behalf and claimed to be "checking bank records". I tightened the rules until the drafts stopped deciding things or claiming actions.

## Accomplishments I'm proud of

- The line between what the AI reads and what the code decides. A customer who says "I paid" gets a PayPal check, not a green tick.
- The first real Sandbox payment showing up as "PayPal verified" with its transaction ID, and the webhook doing the same for a second invoice with no one pressing a sync button.
- A dashboard whose look comes from the thing it replaces, an accountant's aging report, instead of a template.

## What I learned

Free-tier models handle the one-shot jobs well and struggle with long tool definitions, so the model choice for an agent matters more than I expected. Hostile or confusing customer text is a normal input for this product, which is why the model never gets to act on it directly. I also learned how many small choices (fonts, colours, copy, placeholder names) make a screen look generated, and spent real time replacing them with ones that fit the product.

## What's next

- Connect a real inbox, so replies arrive without being pasted in.
- Reminder schedules that pause on a promise and resume when it is missed.
- Multiple businesses and user accounts.
- Partial payments and refunds through PayPal.
- A hosted demo.

## Built with

React, TypeScript, Vite, Node.js, Express, SQLite, PayPal Invoicing API, PayPal webhooks, PayPal Sandbox, AG Studio (AG Grid), Google Gemini API, IBM Plex.

## Tools used (the "model or AI service" field)

- **In the product:** Google Gemini (`gemini-3.5-flash-lite` for reading replies and drafting, `gemini-3-flash-preview` for the chat agents), called from the server.
- **While building:** Claude Code was used as a coding assistant for much of the implementation. I directed the design, reviewed the work and tested it against the PayPal Sandbox and the AG Studio docs.

## Sponsor prize: Best Use of AG Grid

Tallyo uses AG Studio, not only the grid. It has a custom widget, custom cell renderers inside the table widget, a theme and a multi-page report, and it uses the Studio Agent Framework with a custom agent and a Gemini adapter. The prize page lists a gentle-reminder agent that reads unpaid invoices as an example idea, and this project goes further by reading the customer's reply and checking PayPal.

## How to try it

The repository has full setup instructions. In short, you need a PayPal Sandbox app with Invoicing switched on, a free Gemini key and an AG Studio trial licence. With none of them the dashboard still loads with demo data.

- Repository: [add your GitHub link]
- Hosted demo (optional): [add a link if you deploy one]
- Video: [add your YouTube link]

## Testing notes for judges

1. Open the **Invoices** page. Use **Send** on an open invoice, then open its pay link from the **...** menu.
2. Pay it as a Sandbox buyer. Click **Check**, or let the webhook do it, and the row changes to **PayPal verified**.
3. On **Replies**, press **Read new replies** and then **Open draft reply** to see the email editor and the Gmail button.
4. In **Customise**, open the chat panel and try "Which customers are consistently late?".
