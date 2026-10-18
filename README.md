# ArmorIQ Guarded Agent

## Project layout

```text
src/       Agent, planner, ArmorIQ gate, and MCP server
web/       Browser dashboard assets
fixtures/  Non-sensitive demo data only
docs/      Hackathon submission and demo notes
```

A minimal AI-agent security demo: the agent uses Gemini (when configured) to
turn a user goal into a typed tool plan, creates an explicit intent, asks
ArmorIQ for a policy decision, and only then calls a real MCP tool. The project
demonstrates both outcomes:

- **Allowed:** `read_demo_brief` reads a local, non-sensitive brief.
- **Blocked:** `write_demo_note` is attempted by `npm run agent -- --demo` and should be
  denied by an ArmorIQ policy before the MCP server is called.

The MCP server is a real stdio MCP process using
`@modelcontextprotocol/sdk`; this is not a hardcoded authorization demo. The
authorization decision comes from the ArmorIQ platform configured for your
organization.

## Prerequisites

- Node.js 20+
- An ArmorIQ account and API key from
  [platform.armoriq.ai](https://platform.armoriq.ai)
- An ArmorIQ agent and MCP server registered in the platform. Register the MCP
  with the name `armoriq-demo-files`, matching `defaultMcpName` in `agent.js`.

## Configure ArmorIQ

1. Create an API key in **Settings → API Keys**.
2. Register an agent for this project.
3. Register an MCP server named `armoriq-demo-files`.
4. Add a policy that allows `read_demo_brief`.
5. Add a deny policy for `write_demo_note` (for example, deny writes for this
   agent or user). Keep the default behavior fail-closed.
6. Copy `.env.example` to `.env` and set:

   ```text
   ARMORIQ_API_KEY=ak_...
   USER_EMAIL=you@example.com
   GEMINI_API_KEY=...
   ```

The API key is intentionally not included in the repository. Do not commit
`.env`.

## Run

```bash
npm install
npm run agent -- --demo
```

Expected output includes one `✅ ALLOWED by ArmorIQ` line and one
`⛔ BLOCKED by ArmorIQ` line. The blocked call stops before
`write_demo_note` executes; no `demo-output/operator-note.txt` should be
created.

To run only the allowed path:

```bash
npm run agent
```

## Run the website

Start the local dashboard:

```bash
npm start
```

Open [the live Vercel dashboard](https://armoriq-guarded-agent-virid.vercel.app/). The dashboard has a
natural-language goal form, quick allowed/blocked scenarios, and a live
enforcement trace. It calls the same ArmorIQ SDK and MCP server as the CLI;
the browser never receives the API key. Configure `.env` first, otherwise the
API remains fail-closed and the UI shows setup guidance instead of executing
an action. The `/health` endpoint can be used by a hosting provider.

## Deploy for judging

### Vercel (recommended for the submitted website)

This repository includes a Vercel serverless entrypoint in `api/index.js` and
the routing in `vercel.json`. Deploy it like this:

1. Connect the repository.
2. Import the project in Vercel with the repository root as the project root.
3. Add `ARMORIQ_API_KEY`, `USER_EMAIL`, and optionally `GEMINI_API_KEY` as
   server-side environment variables.
4. Deploy, open the generated HTTPS URL, and run both **Allowed read** and
   **Blocked write**.

Vercel runs the MCP child process for the API request. The demo's write tool
uses temporary serverless storage, so it is intentionally a policy-enforcement
demo rather than persistent application storage. Never expose
`ARMORIQ_API_KEY` to browser code or commit `.env`.

### Render or Railway

For a persistent Node service, use `npm install` followed by `npm start`.
Render can use the included `render.yaml`. This option is useful if you want
the local MCP process and demo output directory to remain available while the
service is running.

## How the enforcement works

`planner.js` uses Gemini to select one of the explicitly allowed MCP tools.
The planner validates the model output and merges known arguments; it cannot
authorize or execute an action. `agent.js` uses the official ArmorIQ SDK
lifecycle:

1. `bootstrap()` connects the SDK to ArmorIQ.
2. `startPlan()` records the intended MCP action.
3. `check()` asks ArmorIQ whether the action is allowed.
4. The MCP tool is called only when `check()` returns `allowed`.
5. `report()` records both successful and blocked outcomes for the dashboard.

The code does not treat a denied action as success and does not provide a local
fallback authorization decision. If ArmorIQ is unavailable, the process exits
instead of executing an unverified action.

## Demo video (90 seconds)

Suggested recording:

1. Open the deployed dashboard and show the two ArmorIQ policies.
2. Click **Allowed read** and show the green policy decision.
3. Click **Blocked write** and show the denial before MCP execution.
4. Show the ArmorIQ audit entries, then stop.

## Submission checklist

- Push this repository to GitHub.
- Include a terminal/dashboard recording under 90 seconds.
- Include a screenshot or dashboard trace showing the blocked
  `write_demo_note` action.
- Disclose that the MCP server is a local test server and contains no customer
  or production data.
