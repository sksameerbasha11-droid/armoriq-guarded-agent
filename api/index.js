import { runGuarded, configurationError } from "../src/guarded.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sendJson(response, status, body) {
  response.status(status).setHeader("cache-control", "no-store").json(body);
}

async function sendFrontendFile(request, response) {
  const requestedPath = typeof request.query?.path === "string"
    ? request.query.path
    : request.url?.split("?")[0].replace(/^\/+/, "");
  const fileName = requestedPath || "index.html";
  const filePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web", fileName);
  const relativePath = path.relative(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web"), filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sendJson(response, 404, { error: "Not found." });
  }
  try {
    const content = await fs.readFile(filePath);
    const contentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript"
    };
    response.status(200)
      .setHeader("cache-control", "no-cache")
      .setHeader("content-type", `${contentTypes[path.extname(filePath)] ?? "application/octet-stream"}; charset=utf-8`)
      .send(content);
  } catch (error) {
    if (error?.code === "ENOENT") return sendJson(response, 404, { error: "Not found." });
    throw error;
  }
}

export default async function handler(request, response) {
  if (request.method === "GET" && (typeof request.query?.path === "string" || !request.url?.startsWith("/api/"))) {
    return sendFrontendFile(request, response);
  }

  if (request.method === "GET" && request.url?.split("?")[0] === "/api/status") {
    const error = configurationError();
    return sendJson(response, 200, {
      configured: !error,
      message: error ?? "ArmorIQ configuration is ready."
    });
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  if (request.url?.split("?")[0] !== "/api/run") {
    return sendJson(response, 404, { error: "Not found." });
  }

  const body = request.body ?? {};
  const { goal, note } = body;
  if (typeof goal !== "string" || !goal.trim()) {
    return sendJson(response, 400, { error: "A goal is required." });
  }

  const args = goal.toLowerCase().includes("write")
    ? {
        note:
          typeof note === "string" && note.trim()
            ? note.trim()
            : "Operator note from the dashboard."
      }
    : {};

  try {
    return sendJson(response, 200, await runGuarded(goal.trim(), args));
  } catch (error) {
    console.error("Guarded request failed:", error);
    return sendJson(response, 503, {
      error: error instanceof Error ? error.message : "Request failed."
    });
  }
}
