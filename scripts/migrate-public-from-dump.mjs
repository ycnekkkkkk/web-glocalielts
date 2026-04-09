import fs from "fs";
import path from "path";
import readline from "readline";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const TARGET_TABLES = new Set([
  "users",
  "webinars",
  "webinar_translations",
  "quizzes",
  "quiz_translations",
  "quizzes_questions",
  "quiz_question_translations",
  "quizzes_questions_answers",
  "quizzes_questions_answer_translations",
  "quizzes_results",
]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function unescapeSqlString(s) {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\0/g, "\0");
}

function parseSqlValue(token) {
  const t = token.trim();
  if (t.toUpperCase() === "NULL") return null;
  if (t.startsWith("'") && t.endsWith("'")) return unescapeSqlString(t.slice(1, -1));
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function splitTuples(valuesPart) {
  const tuples = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        tuples.push(valuesPart.slice(start, i));
        start = -1;
      }
    }
  }
  return tuples;
}

function splitFields(tupleContent) {
  const fields = [];
  let inString = false;
  let escaped = false;
  let token = "";
  for (let i = 0; i < tupleContent.length; i++) {
    const ch = tupleContent[i];
    if (inString) {
      token += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      token += ch;
      continue;
    }
    if (ch === ",") {
      fields.push(parseSqlValue(token));
      token = "";
    } else {
      token += ch;
    }
  }
  if (token.length > 0) fields.push(parseSqlValue(token));
  return fields;
}

function mapLegacyCourseStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "published";
  if (s === "is_draft") return "draft";
  return "archived";
}

function mapAttemptStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "passed") return "passed";
  if (s === "failed") return "failed";
  return "submitted";
}

function pickByLocale(rows, localeField, valueField) {
  if (!rows?.length) return null;
  const preferred = ["vi", "vi_vn", "en"];
  for (const l of preferred) {
    const hit = rows.find((r) => String(r[localeField] || "").toLowerCase() === l && r[valueField]);
    if (hit) return hit[valueField];
  }
  return rows.find((r) => r[valueField])?.[valueField] ?? null;
}

async function parseDump(dumpPath) {
  const columnsByTable = new Map();
  const rowsByTable = new Map([...TARGET_TABLES].map((t) => [t, []]));

  const stream = fs.createReadStream(dumpPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let creatingTable = null;
  let pendingInsert = null;

  for await (const line of rl) {
    if (!creatingTable) {
      const createMatch = line.match(/^CREATE TABLE `([^`]+)` \($/);
      if (createMatch && TARGET_TABLES.has(createMatch[1])) {
        creatingTable = createMatch[1];
        columnsByTable.set(creatingTable, []);
        continue;
      }
    } else {
      if (line.startsWith(") ENGINE=")) {
        creatingTable = null;
        continue;
      }
      const colMatch = line.match(/^  `([^`]+)` /);
      if (colMatch) columnsByTable.get(creatingTable).push(colMatch[1]);
      continue;
    }

    if (!pendingInsert) {
      const insertStart = line.match(/^INSERT INTO `([^`]+)` VALUES /);
      if (!insertStart) continue;
      const table = insertStart[1];
      if (!TARGET_TABLES.has(table)) continue;
      pendingInsert = line;
      if (line.endsWith(";")) {
        const stmt = pendingInsert;
        pendingInsert = null;
        const valuesPart = stmt.replace(/^INSERT INTO `[^`]+` VALUES /, "").replace(/;$/, "");
        const tuples = splitTuples(valuesPart);
        const cols = columnsByTable.get(table) || [];
        for (const t of tuples) {
          const fields = splitFields(t);
          const row = {};
          for (let i = 0; i < cols.length && i < fields.length; i++) row[cols[i]] = fields[i];
          rowsByTable.get(table).push(row);
        }
      }
    } else {
      pendingInsert += line;
      if (line.endsWith(";")) {
        const stmt = pendingInsert;
        pendingInsert = null;
        const table = stmt.match(/^INSERT INTO `([^`]+)` VALUES /)?.[1];
        if (!table) continue;
        const valuesPart = stmt.replace(/^INSERT INTO `[^`]+` VALUES /, "").replace(/;$/, "");
        const tuples = splitTuples(valuesPart);
        const cols = columnsByTable.get(table) || [];
        for (const t of tuples) {
          const fields = splitFields(t);
          const row = {};
          for (let i = 0; i < cols.length && i < fields.length; i++) row[cols[i]] = fields[i];
          rowsByTable.get(table).push(row);
        }
      }
    }
  }

  return rowsByTable;
}

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const dumpPath =
    process.env.LEGACY_SQL_DUMP_PATH ||
    path.resolve(process.cwd(), "..", "database", "glocalielts_backup_20260330_000002.sql");

  if (!fs.existsSync(dumpPath)) throw new Error(`Dump file not found: ${dumpPath}`);
  console.log(`Using dump file: ${dumpPath}`);

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[1/5] Parsing SQL dump...");
  const rows = await parseDump(dumpPath);

  const users = rows.get("users");
  const webinars = rows.get("webinars");
  const webinarTranslations = rows.get("webinar_translations");
  const quizzes = rows.get("quizzes");
  const quizTranslations = rows.get("quiz_translations");
  const questions = rows.get("quizzes_questions");
  const questionTranslations = rows.get("quiz_question_translations");
  const answers = rows.get("quizzes_questions_answers");
  const answerTranslations = rows.get("quizzes_questions_answer_translations");
  const quizResults = rows.get("quizzes_results");

  const usersById = new Map(users.map((u) => [Number(u.id), u]));

  console.log("[2/5] Upsert public courses...");
  const courseRows = webinars
    .filter((w) => ["course", "livecourse", "text_lesson"].includes(String(w.type || "").toLowerCase()))
    .map((w) => {
      const wTr = webinarTranslations.filter((t) => Number(t.webinar_id) === Number(w.id));
      const trTitle = pickByLocale(wTr, "locale", "title");
      const trDesc = pickByLocale(wTr, "locale", "description");
      const trSeo = pickByLocale(wTr, "locale", "seo_description");
      return {
        legacy_webinar_id: Number(w.id),
        slug: String(w.slug || `legacy-course-${w.id}-${slugify(trTitle || w.id)}`),
        title: String(trTitle || `Legacy course #${w.id}`),
        short_description: trSeo ? String(trSeo).slice(0, 220) : trDesc ? String(trDesc).slice(0, 220) : null,
        description: trDesc ? String(trDesc) : null,
        teacher_name: usersById.get(Number(w.teacher_id))?.full_name || null,
        thumbnail_url: w.image_cover ? String(w.image_cover) : null,
        demo_video_url: w.video_demo ? String(w.video_demo) : null,
        demo_video_source: w.video_demo_source ? String(w.video_demo_source) : null,
        level: w.level ? String(w.level) : null,
        price: Number(w.price || 0),
        currency: "VND",
        status: mapLegacyCourseStatus(w.status),
        published_at: w.start_date ? new Date(Number(w.start_date) * 1000).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

  if (courseRows.length) {
    const { error } = await supabase.from("public_courses").upsert(courseRows, { onConflict: "legacy_webinar_id" });
    if (error) throw error;
  }

  console.log("[3/5] Upsert public quizzes/questions/options...");
  const quizRows = quizzes.map((q) => {
    const qTr = quizTranslations.filter((t) => Number(t.quiz_id) === Number(q.id));
    const trTitle = pickByLocale(qTr, "locale", "title");
    return {
      legacy_quiz_id: Number(q.id),
      slug: `legacy-quiz-${q.id}-${slugify(trTitle || q.id)}`,
      title: String(trTitle || `Legacy quiz #${q.id}`),
      description: null,
      time_limit_minutes: Number(q.time || 0) || null,
      pass_mark: Number(q.pass_mark || 0),
      total_mark: Number(q.total_mark || 0),
      is_active: String(q.status || "").toLowerCase() === "active",
      updated_at: new Date().toISOString(),
    };
  });
  if (quizRows.length) {
    const { error } = await supabase.from("public_quizzes").upsert(quizRows, { onConflict: "legacy_quiz_id" });
    if (error) throw error;
  }

  const { data: mappedQuizzes, error: mapQuizErr } = await supabase.from("public_quizzes").select("id,legacy_quiz_id,total_mark");
  if (mapQuizErr) throw mapQuizErr;
  const quizIdMap = new Map(mappedQuizzes.map((q) => [Number(q.legacy_quiz_id), q.id]));
  const quizMarkMap = new Map(mappedQuizzes.map((q) => [Number(q.legacy_quiz_id), Number(q.total_mark || 0)]));

  const questionRows = questions
    .filter((qq) => quizIdMap.has(Number(qq.quiz_id)))
    .map((qq) => {
      const qqTr = questionTranslations.filter((t) => Number(t.quizzes_question_id) === Number(qq.id));
      return {
        legacy_question_id: Number(qq.id),
        quiz_id: quizIdMap.get(Number(qq.quiz_id)),
        question_text: String(pickByLocale(qqTr, "locale", "title") || `Question #${qq.id}`),
        question_type: String(qq.type || "multiple"),
        grade: Number(qq.grade || 1),
        sort_order: Number(qq.id),
      };
    });
  if (questionRows.length) {
    const { error } = await supabase.from("public_quiz_questions").upsert(questionRows, { onConflict: "legacy_question_id" });
    if (error) throw error;
  }

  const { data: mappedQuestions, error: mapQuestionErr } = await supabase.from("public_quiz_questions").select("id,legacy_question_id");
  if (mapQuestionErr) throw mapQuestionErr;
  const questionIdMap = new Map(mappedQuestions.map((q) => [Number(q.legacy_question_id), q.id]));

  const optionRows = answers
    .filter((a) => questionIdMap.has(Number(a.question_id)))
    .map((a) => {
      const aTr = answerTranslations.filter((t) => Number(t.quizzes_questions_answer_id) === Number(a.id));
      return {
        legacy_answer_id: Number(a.id),
        question_id: questionIdMap.get(Number(a.question_id)),
        option_text: String(pickByLocale(aTr, "locale", "title") || a.title || `Option #${a.id}`),
        is_correct: !!a.correct,
        sort_order: Number(a.id),
      };
    });
  if (optionRows.length) {
    const { error } = await supabase.from("public_quiz_options").upsert(optionRows, { onConflict: "legacy_answer_id" });
    if (error) throw error;
  }

  console.log("[4/5] Insert attempts for matched users by email...");
  const { data: profiles, error: profileErr } = await supabase.from("profiles").select("id,email");
  if (profileErr) throw profileErr;
  const profileIdByEmail = new Map(
    profiles
      .filter((p) => p.email)
      .map((p) => [String(p.email).trim().toLowerCase(), p.id])
  );

  const attempts = [];
  for (const r of quizResults) {
    const qId = Number(r.quiz_id);
    if (!quizIdMap.has(qId)) continue;
    const legacyUser = usersById.get(Number(r.user_id));
    if (!legacyUser?.email) continue;
    const profileId = profileIdByEmail.get(String(legacyUser.email).trim().toLowerCase());
    if (!profileId) continue;
    attempts.push({
      quiz_id: quizIdMap.get(qId),
      user_id: profileId,
      score: Number(r.user_grade || 0),
      max_score: quizMarkMap.get(qId) || 0,
      status: mapAttemptStatus(r.status),
      answers: r.results || {},
      submitted_at: r.created_at ? new Date(Number(r.created_at) * 1000).toISOString() : new Date().toISOString(),
    });
  }
  if (attempts.length) {
    const { error } = await supabase.from("public_quiz_attempts").insert(attempts);
    if (error) throw error;
  }

  console.log("[5/5] Done");
  console.log(`Courses upserted: ${courseRows.length}`);
  console.log(`Quizzes upserted: ${quizRows.length}`);
  console.log(`Questions upserted: ${questionRows.length}`);
  console.log(`Options upserted: ${optionRows.length}`);
  console.log(`Attempts inserted: ${attempts.length}`);
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
