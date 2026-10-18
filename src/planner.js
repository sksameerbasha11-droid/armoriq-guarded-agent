const allowedTools = [
  {
    name: "read_demo_brief",
    description: "Read the non-sensitive demo brief",
    args: {}
  },
  {
    name: "write_demo_note",
    description: "Write an operator note",
    args: { note: "string" }
  }
];

export async function planGoal(goal, knownArgs = {}) {
  if (typeof goal !== "string" || !goal.trim()) {
    throw new Error("A non-empty goal is required.");
  }
  if (!knownArgs || typeof knownArgs !== "object" || Array.isArray(knownArgs)) {
    throw new Error("Planner arguments must be an object.");
  }
  if (!process.env.GEMINI_API_KEY) {
    const tool = goal.toLowerCase().includes("write")
      ? "write_demo_note"
      : "read_demo_brief";
    return { name: tool, args: knownArgs };
  }

  const prompt = [
    "Choose exactly one tool for the user's goal.",
    `Available tools: ${JSON.stringify(allowedTools)}`,
    `User goal: ${JSON.stringify(goal)}`,
    "Return only JSON in the form {\"name\":\"...\",\"args\":{}}."
  ].join("\n");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(10_000)
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini planning failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error("Gemini returned no plan");
  let plan;
  try {
    plan = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error("Planner returned invalid JSON.");
  }
  if (!plan || typeof plan !== "object" || typeof plan.name !== "string") {
    throw new Error("Planner returned an invalid plan.");
  }
  if (!allowedTools.some((tool) => tool.name === plan.name)) {
    throw new Error(`Planner returned an unsupported tool: ${plan.name}`);
  }
  const plannedArgs = plan.args && typeof plan.args === "object" ? plan.args : {};
  return { name: plan.name, args: { ...plannedArgs, ...knownArgs } };
}
