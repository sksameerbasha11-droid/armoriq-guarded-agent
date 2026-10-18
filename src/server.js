import "dotenv/config";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeMcp } from "./mcp-client.js";
import { configurationError, runGuarded } from "./guarded.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "web");
const port = Number(process.env.PORT || 3000);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

async function requestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 32_000) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (url.pathname === "/api/status") {
      const error = configurationError();
      return sendJson(response, 200, {
        configured: !error,
        message: error ?? "ArmorIQ is configured and ready."
      });
    }
    if (url.pathname === "/api/run" && request.method === "POST") {
      const { goal, note } = await requestBody(request);
      if (typeof goal !== "string" || !goal.trim()) {
        return sendJson(response, 400, { error: "A goal is required." });
      }
      const args = goal.toLowerCase().includes("write")
        ? { note: typeof note === "string" && note.trim() ? note.trim() : "Operator note from the dashboard." }
        : {};
      return sendJson(response, 200, await runGuarded(goal.trim(), args));
    }
    if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const safePath = path.resolve(publicDir, file);
    const relativePath = path.relative(publicDir, safePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return sendJson(response, 404, { error: "Not found." });
    }
    let content;
    try {
      content = await fs.readFile(safePath);
    } catch (error) {
      if (error?.code === "ENOENT") return sendJson(response, 404, { error: "Not found." });
      throw error;
    }
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
    response.writeHead(200, {
      "cache-control": "no-cache",
      "content-security-policy": "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
      "content-type": `${types[path.extname(safePath)] ?? "application/octet-stream"}; charset=utf-8`,
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY"
    });
    response.end(content);
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
    sendJson(response, status, { error: error instanceof Error ? error.message : "Request failed." });
  }
});

server.listen(port, () => console.log(`ArmorIQ Guarded Agent: http://localhost:${port}`));
async function shutdown() {
  await closeMcp();
  server.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
