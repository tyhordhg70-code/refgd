import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other"] as const;

export async function POST(req: NextRequest) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set — add it to your Render environment variables." },
      { status: 503 },
    );
  }

  const body = await req.json();
  const items: { name: string; domain?: string }[] = body.items ?? [];
  if (!items.length) return NextResponse.json({ results: [] });

  const storeList = items
    .map((item, i) => `${i + 1}. ${item.name}${item.domain ? ` (${item.domain})` : ""}`)
    .join("\n");

  const prompt = `You are a retail store classifier with deep knowledge of brands worldwide.
Classify each store into exactly one of these categories: ${CATEGORIES.join(", ")}.

Use your knowledge of what each brand actually sells. For example:
- Zara, Nike, H&M → Clothing
- Apple, Samsung, Best Buy → Electronics  
- Rolex, Tiffany, Pandora → Jewelry
- Whole Foods, DoorDash, Instacart → Food
- HelloFresh, Blue Apron, Factor → Meal Plans
- IKEA, Wayfair, Dyson → Home
- Anything else → Other

Stores to classify:
${storeList}

Return JSON object: {"stores":[{"category":"..."},{"category":"..."},...]}
Same order as input. One entry per store. Use only the listed categories.`;

  let aiRes: Response;
  try {
    aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `Failed to reach OpenAI: ${(e as Error).message}` }, { status: 502 });
  }

  if (!aiRes.ok) {
    const txt = await aiRes.text().catch(() => "");
    return NextResponse.json({ error: `OpenAI error ${aiRes.status}: ${txt.slice(0, 200)}` }, { status: 502 });
  }

  const data = await aiRes.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";

  let results: { category: string }[] = [];
  try {
    const parsed = JSON.parse(content);
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.stores)
      ? parsed.stores
      : Array.isArray(parsed.results)
      ? parsed.results
      : [];
    results = arr.map((r) => {
      const cat = typeof r === "object" && r !== null && "category" in r ? (r as { category: string }).category : "";
      return { category: (CATEGORIES as readonly string[]).includes(cat) ? cat : "Other" };
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json({ results });
}
