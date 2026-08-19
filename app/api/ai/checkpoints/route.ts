import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Gemini, server-side only — the key never reaches the browser. Same two
// prompts the iOS app uses (Portfolio/Services/GeminiService.swift), so a
// project generated on either platform gets the same shape of answer.
//
//   mode: "generate"     → { checkpoints: [{ title, isCompleted, orderIndex, percentage }] }
//   mode: "percentages"  → { percentages: number[] }, aligned to the titles sent

const MODEL = "gemini-flash-latest";

async function gemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI isn't configured yet.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) {
    console.error("Gemini error:", res.status, await res.text());
    throw new Error("The AI service is busy. Try again in a moment.");
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI returned an empty response.");
  return text;
}

// Gemini gets the split roughly right but rarely lands on exactly 100; the last
// entry absorbs the difference, same as the iOS client does.
function normalize(percentages: number[]): number[] {
  if (!percentages.length) return percentages;
  const total = percentages.reduce((a, b) => a + b, 0);
  if (total !== 100) percentages[percentages.length - 1] += 100 - total;
  return percentages;
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") ?? "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return new Response("Unauthorized", { status: 401 });
    await adminAuth().verifyIdToken(idToken);

    const { mode, title, description, techStack, links, titles } = await req.json();

    if (mode === "percentages") {
      if (!Array.isArray(titles) || titles.length === 0) {
        return Response.json({ error: "Add some checkpoints first." }, { status: 400 });
      }
      if (titles.length === 1) return Response.json({ percentages: [100] });

      const list = titles.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");
      const text = await gemini(`You are an experienced project mentor. Below is an ordered list of milestones/checkpoints the user wrote for their project. Assign each one a "percentage" representing its share of the overall project effort.

Checkpoints:
${list}

CRITICAL RULES:
- Return exactly ${titles.length} percentages, one per checkpoint, in the SAME order as listed.
- The sum of ALL percentages MUST equal EXACTLY 100.
- Distribute realistically based on effort (heavier phases get more).
- Return ONLY a valid JSON array of integers, e.g. [10, 15, 30, 25, 20]. No extra text.`);

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length !== titles.length) {
        return Response.json({ error: "The AI response didn't match your checkpoints. Try again." }, { status: 502 });
      }
      return Response.json({ percentages: normalize(parsed.map(Number)) });
    }

    if (!title?.trim()) {
      return Response.json({ error: "Give the project a title first." }, { status: 400 });
    }

    const techList = Array.isArray(techStack) && techStack.length ? techStack.join(", ") : "Not specified";
    const linkList = Array.isArray(links) && links.length
      ? links.map((l: { type: string; url: string }) => `${l.type}: ${l.url}`).join(", ")
      : "None";

    const text = await gemini(`You are an experienced project mentor. Your audience is broad — developers, designers, creators, and students — so adapt the milestones to whatever kind of project this is (an app, a design, a research paper, a video, a business, an engineering project etc.). Generate 5-8 realistic milestones/checkpoints.

Project Title: ${title}
Project Description: ${description ?? ""}
Tech Stack / Tools: ${techList}
Links: ${linkList}

CRITICAL RULES:
- Each checkpoint is a short, readable title in Title Case (2-5 words)
- Use plain spaces between words — never underscores, snake_case, or hyphens joining words
- Order them logically from project start to finish
- Assign a "percentage" to each checkpoint representing its share of overall project effort
- The sum of ALL percentages MUST equal EXACTLY 100
- Distribute percentages realistically based on effort (heavier phases get more)
- All checkpoints start as not completed
- Return ONLY a valid JSON array, no extra text

JSON Format:
[
  {"title": "Planning & Research", "isCompleted": false, "orderIndex": 1, "percentage": 10},
  {"title": "Design & Structure", "isCompleted": false, "orderIndex": 2, "percentage": 15},
  {"title": "Core Build", "isCompleted": false, "orderIndex": 3, "percentage": 30}
]`);

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return Response.json({ error: "The AI didn't return any checkpoints. Try again." }, { status: 502 });
    }

    const percentages = normalize(parsed.map((c: { percentage?: number }) => Number(c.percentage) || 0));
    const checkpoints = parsed.map((c: { title?: string }, i: number) => ({
      title: String(c.title ?? "").trim(),
      isCompleted: false,
      orderIndex: i,
      percentage: percentages[i],
    }));

    return Response.json({ checkpoints });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("ai/checkpoints error:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
