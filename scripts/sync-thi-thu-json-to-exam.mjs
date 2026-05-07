import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildListening(listeningRaw) {
  const blocks = [];
  const questions = [];
  const answers = {};

  for (const [idx, part] of (listeningRaw.parts || []).entries()) {
    const section = `listening_part_${idx + 1}`;
    const ids = (part.questions || []).map((q) => Number(q.id)).filter((x) => Number.isFinite(x));
    const range = ids.length ? ` (Questions ${Math.min(...ids)}-${Math.max(...ids)})` : "";
    const label = `Part ${part.part}${range}`;
    const audio = part.audioUrl
      ? `<p>Nghe audio trực tiếp bên dưới:</p>`
      : "";
    const inst = part.instruction ? `<p>${escapeHtml(part.instruction)}</p>` : "";
    blocks.push({
      type: "text",
      section,
      html: `<h3>${escapeHtml(label)}</h3>${inst}${audio}`,
    });
    if (part.audioUrl) {
      blocks.push({
        type: "audio",
        section,
        url: part.audioUrl,
        label: `Nghe audio ${label}`,
      });
    }

    if (part.image) {
      blocks.push({
        type: "image",
        section,
        src: part.image,
        alt: `Listening Map/Diagram`
      });
    }

    if (part.options_map && typeof part.options_map === "object") {
      const qRows = (part.questions || [])
        .map((q) => {
          const qNo = escapeHtml(q.id);
          const qStem = escapeHtml(q.stem || "");
          return `<tr><td><strong>${qNo}</strong></td><td>${qStem}</td><td>______</td></tr>`;
        })
        .join("");
      const rows = Object.entries(part.options_map)
        .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`)
        .join("");
      blocks.push({
        type: "text",
        section,
        html: `
<div class="overflow-auto">
  <table>
    <thead>
      <tr>
        <th colspan="3">Questions</th>
        <th style="width:24px"></th>
        <th colspan="2">Answer box</th>
      </tr>
      <tr>
        <th>No.</th>
        <th>Item</th>
        <th>Your answer</th>
        <th></th>
        <th>Letter</th>
        <th>Meaning</th>
      </tr>
    </thead>
    <tbody>
      ${qRows}
      <tr><td colspan="6"></td></tr>
      ${rows}
    </tbody>
  </table>
</div>`,
      });
    }

    for (const q of part.questions || []) {
      const id = `l${q.id}`;
      const stem = String(q.stem || "").trim();
      const qType = q.type === "text" ? "text" : q.type || "single_choice";
      const options = Array.isArray(q.options) ? q.options : (qType === "true_false_not_given" ? ["True", "False", "Not Given"] : undefined);
      questions.push({ id, stem, type: qType, options, section, display_no: Number(q.id) || undefined, options_map: part.options_map });

      const ans = part.answers?.[String(q.id)];
      if (ans) {
        if (typeof ans === "string" && ans.length === 1 && /[A-Z]/.test(ans) && options) {
          const idxAns = ans.charCodeAt(0) - 65;
          answers[id] = options[idxAns] ?? ans;
        } else {
          answers[id] = ans;
        }
      }
    }
  }

  return {
    title: listeningRaw.title || "Listening",
    blocks,
    questions,
    answers,
  };
}

function buildSpeaking(speakingRaw) {
  const blocks = [];
  for (const p of speakingRaw.parts || []) {
    let html = `<h3>Part ${escapeHtml(p.part)}</h3>`;
    if (p.type) html += `<p><em>${escapeHtml(p.type)}</em></p>`;
    if (Array.isArray(p.questions) && p.questions.length) {
      html += `<ol>${p.questions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>`;
    }
    if (p.task) html += `<p><strong>Task:</strong> ${escapeHtml(p.task)}</p>`;
    if (Array.isArray(p.cues) && p.cues.length) {
      html += `<ul>${p.cues.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    }
    if (p.follow_up) html += `<p><strong>Follow-up:</strong> ${escapeHtml(p.follow_up)}</p>`;
    blocks.push({ type: "text", html });
  }
  return {
    title: speakingRaw.title || "Speaking",
    blocks,
    prompt: "Hoàn thành đầy đủ Part 1, Part 2 và Part 3 theo đề.",
  };
}

function buildReading(readingRaw) {
  const blocks = [];
  const questions = [];
  const answers = {};

  for (const [idx, p] of (readingRaw.passages || []).entries()) {
    const section = `reading_passage_${idx + 1}`;
    const ids = (p.questions || []).map((q) => Number(q.id)).filter((x) => Number.isFinite(x));
    const range = ids.length ? ` (Questions ${Math.min(...ids)}-${Math.max(...ids)})` : "";
    const lines = (p.text || []).map((x) => `<p>${escapeHtml(x)}</p>`).join("");
    blocks.push({
      type: "text",
      section,
      html: `<h3>Passage ${escapeHtml(p.passage)}${range}: ${escapeHtml(p.title || "")}</h3><p>${escapeHtml(
        p.instruction || ""
      )}</p>${lines}`,
    });

    for (const q of p.questions || []) {
      const id = `r${q.id}`;
      const stem = String(q.stem || "").trim();
      const options = Array.isArray(q.options) ? q.options : [];
      questions.push({
        id,
        stem,
        type: "single_choice",
        options,
        section,
        display_no: Number(q.id) || undefined,
      });
      const ans = p.answers?.[String(q.id)];
      if (typeof ans === "string") {
        if (ans.length === 1 && /[A-Z]/.test(ans)) {
          const idxAns = ans.charCodeAt(0) - 65;
          answers[id] = options[idxAns] ?? ans;
        } else {
          answers[id] = ans;
        }
      }
    }
  }

  return {
    section: {
      title: readingRaw.title || "Reading",
      blocks,
      questions,
    },
    answers,
  };
}

function buildWriting(writingRaw) {
  const blocks = [];
  let maxWords = 0;
  for (const t of writingRaw.tasks || []) {
    maxWords = Math.max(maxWords, Number(t.minWords || 0));
    let html = `<h3>Task ${escapeHtml(t.task)}</h3>`;
    if (t.instruction) html += `<p>${escapeHtml(t.instruction)}</p>`;
    if (t.prompt) html += `<p><strong>Prompt:</strong> ${escapeHtml(t.prompt)}</p>`;
    
    if (t.data?.headers && t.data?.rows) {
      const header = `<tr><th>Company</th>${t.data.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("")}</tr>`;
      const body = t.data.rows
        .map((r) => {
          const cells = (r.values || []).map((v) => `<td>${escapeHtml(v)}</td>`).join("");
          return `<tr><td>${escapeHtml(r.company)}</td>${cells}</tr>`;
        })
        .join("");
      html += `<div class="overflow-auto"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
      if (t.data.unit) html += `<p><em>Unit: ${escapeHtml(t.data.unit)}</em></p>`;
    }
    blocks.push({ type: "text", html });

    if (t.image) {
      blocks.push({
        type: "image",
        src: t.image,
        alt: `Task ${t.task} Image`
      });
    }
  }
  return {
    title: writingRaw.title || "Writing",
    blocks,
    prompt: "Làm đầy đủ Task 1 và Task 2 theo đề.",
    minWords: maxWords || 250,
  };
}

async function main() {
  const root = process.cwd();
  const listeningFile = path.join(root, "thi_thu", "listening.json");
  const speakingFile = path.join(root, "thi_thu", "speaking.json");
  const writingFile = path.join(root, "thi_thu", "writing.json");

  const listeningRaw = readJson(listeningFile).listening;
  const readingFile = path.join(root, "thi_thu", "reading.json");
  const readingRaw = fs.existsSync(readingFile) ? readJson(readingFile).reading : null;
  const speakingRaw = readJson(speakingFile).speaking;
  const writingRaw = readJson(writingFile).writing;

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: exam, error: examErr } = await supabase
    .from("mock_skill_exam_defs")
    .select("id, slug, content_public")
    .eq("slug", "ielts-full-mock-1")
    .maybeSingle();
  if (examErr || !exam) throw new Error(`Cannot find exam: ${examErr?.message || "not found"}`);

  const prev = exam.content_public || {};
  const next = {
    ...prev,
    version: Number(prev.version || 1) + 1,
    listening: buildListening(listeningRaw),
    reading: readingRaw ? buildReading(readingRaw).section : prev.reading,
    speaking: buildSpeaking(speakingRaw),
    writing: buildWriting(writingRaw),
  };

  const { error: upErr } = await supabase
    .from("mock_skill_exam_defs")
    .update({ content_public: next, content_drive_file_id: null, content_drive_url: null, updated_at: new Date().toISOString() })
    .eq("id", exam.id);
  if (upErr) throw upErr;

  // Update answers from Listening
  const listeningPack = buildListening(listeningRaw);
  const { data: answerRow } = await supabase
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", exam.id)
    .maybeSingle();
  const prevAnswers = answerRow?.answers || {};
  const merged = {
    ...prevAnswers,
    listening: { ...prevAnswers.listening, ...listeningPack.answers },
  };

  if (readingRaw) {
    const readingPack = buildReading(readingRaw);
    merged.reading = { ...prevAnswers.reading, ...readingPack.answers };
  }

  const { error: ansErr } = await supabase
    .from("mock_skill_exam_answers")
    .upsert({ exam_id: exam.id, answers: merged, updated_at: new Date().toISOString() }, { onConflict: "exam_id" });
  if (ansErr) throw ansErr;

  console.log("Updated exam from thi_thu/*.json:", exam.slug);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
