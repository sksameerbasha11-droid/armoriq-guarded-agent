import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

let client;
let transport;

export async function connectMcp() {
  if (client) return client;
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(path.dirname(fileURLToPath(import.meta.url)), "mcp-server.js")],
    stderr: "inherit"
  });
  client = new Client(
    { name: "armoriq-guarded-agent", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  return client;
}

export async function callMcpTool(name, args) {
  if (!client) throw new Error("MCP client is not connected");
  return client.callTool({ name, arguments: args });
}

export async function closeMcp() {
  await transport?.close();
  client = undefined;
  transport = undefined;
}
