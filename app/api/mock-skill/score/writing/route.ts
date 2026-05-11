import { scoreWriting } from "@/lib/gemini/score-writing";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  essay: z.string().min(1).max(10000),
  wordCount: z.number().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const score = await scoreWriting(parsed.data.prompt, parsed.data.essay, parsed.data.wordCount);
    return NextResponse.json({ ok: true, score });
  } catch (err) {
    console.error("[score/writing]", err);
    return NextResponse.json({ error: "AI scoring failed", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
