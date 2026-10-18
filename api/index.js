import { runGuarded, configurationError } from "../src/guarded.js";

function sendJson(response, status, body) {
  response.status(status).setHeader("cache-control", "no-store").json(body);
}

export default async function handler(request, response) {
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
