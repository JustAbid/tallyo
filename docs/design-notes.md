# Design notes

Why Tallyo looks the way it does, and the reading behind it.

## The problem

Interfaces built with AI help tend to look alike, because a model asked for "a modern dashboard" returns the middle of everything it has seen. The sources below agree on the common tells, and one of them makes a point I took seriously: swapping one default for another does not help. Ban the purple gradient and the next most likely look is warm cream with a terracotta accent, or near-black with one neon highlight. The goal is not to avoid a list of things. It is to make every visible choice one somebody made for this product.

## The direction

Tallyo replaces the aging report in an accountant's ledger, so the look comes from there.

**Colour.** A cool ledger-paper grey, one ink-blue accent, and three status colours that each mean exactly one thing.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| Ink blue | `#23506f` | `#86b6de` | Primary actions, money still to collect |
| Stamp red | `#b3261e` | `#f0948b` | Overdue, errors |
| Check green | `#2a734a` | `#7fcb9c` | Confirmed by PayPal |
| Pencil amber | `#8f5600` | `#e4b25c` | Recorded by hand, worth a look |
| Signal violet | `#5b4aa6` | `#b9acf0` | Only what the AI does or writes |

Signal violet is the one deliberate "this is an AI product" cue. Reading how other design systems mark AI (Cloudscape, PatternFly, SAP), there is no standard colour. The common convention is a four-point sparkle with a text label, and they warn against relying on the icon alone. So violet appears in three places: the sparkle, the "AI draft" tag on drafts, and the buttons that start AI work (Read new replies, Draft a reminder). Everywhere else the dashboard stays in the ledger palette, so the AI reads as a distinct layer on top of the money and not as the whole look.

**Theme.** A three-way toggle (light, dark, match my computer) in the header. "Match my computer" stores nothing, so someone who never touches it always follows their system. A small script in `index.html` picks the theme before the first paint to avoid a flash, and storage access is wrapped so a blocked `localStorage` cannot break the page.

I computed the WCAG contrast ratio for every text and background pair the interface uses, in both modes. All 25 pairs pass AA (4.5:1). The tightest is the green badge text in light mode at 4.77:1, and body text is 16.9:1. The muted text colour is `#5d676d` because the lighter grey I started with fell below 4.5:1.

**Type.** IBM Plex Sans for the interface and Plex Mono where a fixed width helps. Both are self-hosted. Plex has proper tabular figures, which matters in a table of amounts. I did not use Inter, and I did not go the other way into a serif display face with hairline rules, which is the second most common "anti-AI" look.

**Layout.** Tables are tables, with right-aligned amounts and quiet rules, because the content is tabular. The Overview uses one large number for what matters most (what is overdue right now) and smaller ones for the rest, instead of three equal cards. Radii vary by role: 3px badges, 4px buttons, 8px menus, 10px dialogs.

**Mark.** A hand-drawn tally mark: four strokes and the slash that closes a count of five. It is a shape from the product's own world, not a rounded square with a letter in it.

**Motion.** Calm and tied to what the person does. There is a loading skeleton shaped like the real Overview, a soft fade into the dashboard, short transitions on menus, dialogs and buttons, and a small spinner on a button while it works. There is no count-up on numbers, no fade-in on every section, and everything switches off under `prefers-reduced-motion`.

**Copy.** Plain and specific. Buttons say what they do ("Open draft reply", "Mark as paid by hand"). Error text says what happened and what to try. Nothing claims an email was sent when it was only drafted.

**Data.** Invented clients with believable names and amounts like $1,318.75, not "Acme Corp" and $1,000. Demo addresses end in `.example` and the email editor warns about them.

## What I checked before shipping

- Does anything here look like a default nobody chose?
- Does every colour carry one meaning?
- Is each animation a response to something the person did?
- Does the skeleton match the page it stands in for, so nothing jumps?
- Are there loading, empty and error states, and keyboard focus styles?

## Sources

Design tells and how to avoid them

1. [Why Your AI Keeps Building the Same Purple Gradient Website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
2. [How to Fix AI Slop in Web Design, Tell by Tell](https://capitalandcompute.net/blog/fix-ai-slop-design/)
3. [How to Keep Your Website From Looking Like Every Other Vibe Coded Website](https://codemyspec.com/blog/vibe-coded-websites-look-the-same)
4. [Anti-AI slop ban list](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list)
5. [How to detect AI slop in your design](https://github.com/Laith0003/ux-skill/wiki/How-to-detect-AI-slop-in-your-design)
6. [Hallmark's anti-patterns: banned fonts, gradients and layout patterns](https://instagit.com/Nutlope/hallmark/what-are-hallmarks-anti-patterns-including-banned-fonts-gradients-and-layout-patterns/)
7. [Unslop UI playbook](https://claudecodehq.com/playbooks/unslop-ui)
8. [Anti-patterns: the AI slop catalog](https://cdn.jsdelivr.net/npm/@wystack/agent-kit@0.12.0/wystack-agent-kit/references/anti-patterns.md)
9. [Can AI design a UI for me? Why AI fails at app design](https://vp0.com/blogs/can-ai-design-a-ui-for-me.md)
10. [The free tool that fights AI design slop](https://www.stork.ai/blog/the-free-tool-that-fights-ai-design-slop)

Colour

11. [The hidden dangers of automated colour palette generators](https://bootcamp.uxdesign.cc/the-hidden-dangers-of-automated-color-palette-generators-68ae99927c8f)
12. [AI colour palette generators: how they work and their limits](https://lollypop.design/blog/2026/may/ai-color-palette-generator/)
13. [Colour in app design (Vaadin docs)](https://origin.vaadin.com/docs/latest/designing-apps/color)

Typography

14. [Font pairings for SaaS and fintech products](https://fontalternatives.com/blog/font-pairings-saas-fintech-products/)
15. [How to choose font pairings for a product interface](https://designproject.io/resources/guides/choose-font-pairings/)
16. [Typography in UI design](https://www.eleken.co/blog-posts/typography-design)

Dashboards

17. [Stripe dashboard design breakdown: trust through clarity](https://www.925studios.co/blog/stripe-dashboard-design-breakdown)
18. [Dashboard design best practices for SaaS](https://www.brand.dev/blog/dashboard-design-best-practices)
19. [Why your dashboard looks busy (and your users feel lost)](https://phenomenonstudio.com/article/why-your-dashboard-looks-busy-and-your-users-feel-lost/)

Loading and motion

20. [Loading skeletons that don't lie](https://dev.to/raxxostudios/loading-skeletons-that-dont-lie-5-patterns-for-honest-perceived-performance-283p)
21. [Skeleton screens: what they are and why they improve UX](https://clay.global/blog/skeleton-screen)

AI interface conventions and themes

25. [Iconography for generative AI (Cloudscape)](https://cloudscape.design/gen-ai/foundation/iconography/)
26. [AI design language (PatternFly)](https://www.patternfly.org/ai/design-language)
27. [AI colors (SAP Fiori)](https://www.sap.com/design-system/fiori-design-web/v1-145/foundations/ai-and-joule-design/foundation/ai-colors)
28. [Dark mode toggles (Chrome developers)](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/dark-mode-toggle)
29. [Semantic colour palette (ServiceTitan Anvil)](https://anvil.servicetitan.com/docs/web/data-visualization/semantic-color-palette)

Copy and writing

22. [AI UX writing: where it works and fails](https://blog.logrocket.com/ux-design/ai-ux-writing-where-it-works-and-fails/)
23. [Stop sounding like AI (microcopy)](https://microcopyexamples.substack.com/p/stop-sounding-like-ai)
24. [Treat AI-generated READMEs like first drafts](https://hackernoon.com/treat-ai-generated-readmes-like-first-drafts)

Most of these are blogs, community wikis and tool documentation, not research, so I treated them as practitioner opinion. Where they agreed, I acted on it. Where a single source made a claim I could not check, I left it out.
