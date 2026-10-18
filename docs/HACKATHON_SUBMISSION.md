# Hackathon submission brief

## What we built

Sentinel is a governed AI agent dashboard. A user enters a natural-language
goal, an LLM planner maps it to a typed MCP action, ArmorIQ verifies that
intent against organization policy, and the MCP tool runs only after an
allow decision.

## Required integrations

- **AI agent:** `src/agent.js` and `src/planner.js`; Gemini is supported through
  `GEMINI_API_KEY`, with a constrained local planner for offline setup.
- **MCP server:** `src/mcp-server.js`, connected over stdio by
  `@modelcontextprotocol/sdk`.
- **ArmorIQ:** `src/server.js` and `src/agent.js` use the official SDK lifecycle:
  `bootstrap`, `startPlan`, `check`, and `report`.

## Proof of enforcement

Configure these policies in platform.armoriq.ai:

1. Allow `read_demo_brief` for the registered `armoriq-demo-files` MCP.
2. Deny `write_demo_note` for the demo agent or user.

Run `npm start`, open the service URL (or `http://localhost:3000` locally), then choose **Allowed read**
and **Blocked write**. The dashboard displays the live decision and audit
result. The blocked path returns before the MCP write tool executes.

The API key is never sent to the browser. Missing configuration fails closed.
The only data is the non-sensitive text in `fixtures/brief.txt`; there are no
customer records, payment systems, or production credentials.

## Demo recording (under 90 seconds)

1. Show the two ArmorIQ policies (10 seconds).
2. Show the dashboard and click **Allowed read** (20 seconds).
3. Click **Blocked write** and show the ArmorIQ denial (20 seconds).
4. Refresh the ArmorIQ dashboard and show both audit events (25 seconds).
5. Close on the repository README and local-test disclosure (10 seconds).

## Runbook

```bash
npm install
Copy-Item .env.example .env
# Add ARMORIQ_API_KEY, USER_EMAIL, and optional GEMINI_API_KEY.
npm start
```

## Judge-facing deployment

The repository includes a Vercel serverless API in `api/index.js` and routing
in `vercel.json`. Import the GitHub repository into Vercel, set
`ARMORIQ_API_KEY`, `USER_EMAIL`, and optional `GEMINI_API_KEY` as server-side
environment variables, then deploy. The deployed dashboard calls the same
guarded flow and keeps the ArmorIQ key out of the browser.

Render or Railway remain alternatives when a persistent Node service is
preferred. The Vercel write demo uses temporary serverless storage; its
purpose is to prove that the policy blocks the action before the MCP tool
executes.
