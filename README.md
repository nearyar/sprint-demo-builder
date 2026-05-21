# Sprint Demo Builder

A tool for developers to generate structured sprint review demo scripts from a Jira ticket without needing the product owner in the room.

**[Live demo →](https://sprint-demo-builder.vercel.app)**

![Sprint Demo Builder screenshot](screenshot.png)

---

## What it does

Paste in a ticket title, acceptance criteria, and optional notes. The app generates:

- **User problem solved** - plain language explanation of the why, tailored to your audience
- **Demo script** - a spoken script the developer can read aloud
- **Happy path** - ordered steps of what to click and show
- **Edge cases** - interesting edge cases worth showing if time allows
- **What NOT to demo** - the institutional knowledge that usually only lives in the PO's head
- **Stakeholder questions** - prompts to get useful feedback after the demo

Supports three audience modes: internal team review, executive stakeholders, and client-facing.

---

## Built with

- [React](https://react.dev) + [Vite](https://vitejs.dev)
- [Anthropic Claude API](https://docs.anthropic.com)
- Deployed on [Vercel](https://vercel.com)

---

## Running locally

```bash
git clone https://github.com/nearyar/sprint-demo-builder.git
cd sprint-demo-builder
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_key_here
```

Then:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` as an environment variable in Vercel project settings
4. Deploy - Vercel auto-detects Vite

---

## Background

The "what NOT to demo" section is the sleeper feature. It captures the judgment calls that usually require the product owner to be present.
