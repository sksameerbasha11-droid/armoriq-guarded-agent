;;
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
