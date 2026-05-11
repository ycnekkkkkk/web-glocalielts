import { scoreSpeaking } from "@/lib/gemini/score-speaking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = form.get("audio");
  const prompt = String(form.get("prompt") || "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  if (!(audioFile instanceof File) || audioFile.size === 0) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file too large (max 20MB)" }, { status: 400 });
  }

  try {
    const buf = await audioFile.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const score = await scoreSpeaking(base64, audioFile.type || "audio/webm", prompt);
    return NextResponse.json({ ok: true, score });
  } catch (err) {
    console.error("[score/speaking]", err);
    return NextResponse.json({ error: "AI scoring failed", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
