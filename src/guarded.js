import "dotenv/config";
import { ArmorIQClient } from "@armoriq/sdk";
import { connectMcp, callMcpTool } from "./mcp-client.js";
import { planGoal } from "./planner.js";

let session;
let sessionCreatedAt = 0;

export function configurationError() {
  if (!process.env.ARMORIQ_API_KEY || process.env.ARMORIQ_API_KEY === "ak_replace_me") {
    return "Add a real ARMORIQ_API_KEY to the deployment environment.";
  }
  if (!process.env.USER_EMAIL) return "Add USER_EMAIL to the deployment environment.";
  return null;
}

async function getSession() {
  const error = configurationError();
  if (error) throw new Error(error);
  if (session && Date.now() - sessionCreatedAt < 9 * 60 * 1000) return session;

  const armor = new ArmorIQClient({ apiKey: process.env.ARMORIQ_API_KEY });
  await armor.bootstrap();
  await connectMcp();
  session = armor.forUser(process.env.USER_EMAIL).startSession({
    mode: "sdk",
    defaultMcpName: "armoriq-demo-files",
    validitySeconds: 600
  });
  sessionCreatedAt = Date.now();
  return session;
}

export async function runGuarded(goal, args = {}) {
  const activeSession = await getSession();
  const planned = await planGoal(goal, args);
  await activeSession.startPlan([{ name: planned.name, args: planned.args }], goal);
  const decision = await activeSession.check(planned.name, planned.args, process.env.USER_EMAIL);
  if (!decision.allowed) {
    await activeSession.report(planned.name, planned.args, null, {
      status: "failed",
      errorMessage: decision.reason
    });
    return { status: "blocked", tool: planned.name, reason: decision.reason };
  }

  try {
    const result = await callMcpTool(planned.name, planned.args);
    const text = result.content?.find((item) => item.type === "text")?.text ?? "";
    await activeSession.report(planned.name, planned.args, { text });
    return { status: "allowed", tool: planned.name, result: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP execution failed.";
    await activeSession.report(planned.name, planned.args, null, {
      status: "failed",
      errorMessage: message
    });
    throw error;
  }
}
