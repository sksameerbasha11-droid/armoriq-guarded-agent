import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = new McpServer({
  name: "armoriq-demo-files",
  version: "1.0.0"
});

server.tool(
  "read_demo_brief",
  "Read the non-sensitive demo brief.",
  {},
  async () => {
    const brief = await fs.readFile(path.join(root, "fixtures", "brief.txt"), "utf8");
    return { content: [{ type: "text", text: brief }] };
  }
);

server.tool(
  "write_demo_note",
  "Write an operator note to the demo output directory.",
  { note: z.string().min(1).max(500) },
  async ({ note }) => {
    const outputDir = path.join(root, "demo-output");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "operator-note.txt");
    await fs.writeFile(outputPath, `${note}\n`, "utf8");
    return { content: [{ type: "text", text: `Wrote ${outputPath}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
