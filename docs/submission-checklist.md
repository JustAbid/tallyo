# Submission checklist

Tick these off in order. Anything marked **you** needs a person; the rest is already done or I can do it.

## Accounts and access

- [ ] **You:** Devpost registration for the PayPal AI Hackathon is active.
- [ ] **You:** PayPal Sandbox app still exists and has **Invoicing** switched on.
- [ ] **You:** AG Studio trial licence is valid on the dates judging happens. The current one expires on 26 December 2026. Judging is 1 to 15 December.
- [ ] **You:** Ask AG Grid on the PayPal Discord what judges should do about the licence if the trial lapses, and whether the trial includes the AI features Tallyo uses. Write down the answer.
- [ ] **You:** Gemini key is on the free tier. In Google AI Studio, check there is no billing account attached to the project.

## Repository

- [ ] Repository is **public** on GitHub.
- [ ] The licence file shows in the About section on GitHub (MIT).
- [ ] Add a GitHub description and topics (for example `paypal`, `invoicing`, `ag-grid`, `gemini`, `hackathon`).
- [ ] `server/.env` and `client/.env.local` are not in the repository. Run `git ls-files | findstr /i env` and confirm only `.env.example` appears.
- [ ] Search the repository for your keys once more before the final push.
- [ ] README setup steps work on a fresh clone: clone into a new folder, follow the steps, load the dashboard.
- [ ] Replace "Tallyo contributors" in `LICENSE` with your name if you want it there.

## The project itself

- [ ] Reset the demo data (`npm run seed` in `server/`) so the first screen is clean. Note that this forgets the Sandbox payments recorded locally.
- [ ] Start from a state where one invoice is unsent, one is sent but unpaid, and one is already PayPal verified.
- [ ] Check the Gmail button opens a compose window with the recipient, subject and message filled in.
- [ ] Check the chat panel answers one data question correctly.
- [ ] Check both light and dark mode look right.
- [ ] If you use the webhook for the demo: start the tunnel, update the webhook address in PayPal, and update `PAYPAL_WEBHOOK_ID` if it changed. The tunnel address changes every time it restarts.

## Devpost form

- [ ] Project name, tagline and description pasted from `docs/devpost-submission.md` and edited so it sounds like you.
- [ ] "Tools used" field filled in (Gemini in the product, Claude Code while building).
- [ ] Built-with tags added.
- [ ] Repository link added.
- [ ] Demo access explained: setup steps in the README, or a hosted URL if you deploy one.
- [ ] Sponsor prize selected: **Best Use of AG Grid**.
- [ ] Team members added, if any.

## Video

- [ ] Video is uploaded to YouTube, set to **public**, and shorter than 3 minutes.
- [ ] No copyrighted music or third-party trademarks in it.
- [ ] Link added to the Devpost form.

## Final

- [ ] Open the Devpost submission in a private window and click through every link.
- [ ] Submit before the deadline shown on Devpost. Check the countdown and convert the time zone yourself.
- [ ] Keep the Sandbox app, repository and video available through the end of judging.
