import "dotenv/config";
import { ArmorIQClient } from "@armoriq/sdk";
import { connectMcp, callMcpTool, closeMcp } from "./mcp-client.js";
import { planGoal } from "./planner.js";

const userEmail = process.env.USER_EMAIL;
const isDemo = process.argv.includes("--demo");
const apiKey = process.env.ARMORIQ_API_KEY;

if (!apiKey || apiKey === "ak_replace_me") {
  throw new Error(
    "ARMORIQ_API_KEY is required. Generate one at https://platform.armoriq.ai and put it in .env."
  );
}
if (!userEmail) throw new Error("USER_EMAIL is required in .env.");

const calls = isDemo
  ? [
      {
        goal: "Read the non-sensitive demo brief",
        tool: "read_demo_brief",
        args: {}
      },
      {
        goal: "Write an operator note to the demo output directory",
        tool: "write_demo_note",
        args: { note: "This write should be blocked by the ArmorIQ policy." }
      }
    ]
  : [
      {
        goal: "Read the non-sensitive demo brief",
        tool: "read_demo_brief",
        args: {}
      }
    ];

async function executeGuarded(session, step) {
  const planned = await planGoal(step.goal, step.args);
  const action = { ...step, tool: planned.name, args: planned.args };
  console.log(`\nIntent: ${step.goal}`);
  await session.startPlan([{ name: action.tool, args: action.args }], step.goal);

  const decision = await session.check(action.tool, action.args, userEmail);
  if (!decision.allowed) {
    console.log(`⛔ BLOCKED by ArmorIQ: ${decision.reason}`);
    await session.report(action.tool, action.args, null, {
      status: "failed",
      errorMessage: decision.reason
    });
    return { status: "blocked", reason: decision.reason };
  }

  try {
    const result = await callMcpTool(action.tool, action.args);
    const text = result.content?.find((item) => item.type === "text")?.text ?? "";
    await session.report(action.tool, action.args, { text });
    console.log(`✅ ALLOWED by ArmorIQ; MCP result: ${text.trim()}`);
    return { status: "allowed", result: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP execution failed.";
    await session.report(action.tool, action.args, null, {
      status: "failed",
      errorMessage: message
    });
    throw error;
  }
}

async function main() {
  const armor = new ArmorIQClient({ apiKey });
  await armor.bootstrap();
  await connectMcp();

  const session = armor.forUser(userEmail).startSession({
    mode: "sdk",
    defaultMcpName: "armoriq-demo-files",
    validitySeconds: 600
  });

  console.log("ArmorIQ Guarded Agent");
  console.log("Every MCP call is checked before execution.");
  for (const step of calls) await executeGuarded(session, step);
}

try {
  await main();
} finally {
  await closeMcp();
}
