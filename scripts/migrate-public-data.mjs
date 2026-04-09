import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

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

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
    [table, column]
  );
  return rows.length > 0;
}

async function fetchRows(conn, table, columns) {
  const exists = [];
  for (const c of columns) {
    if (await hasColumn(conn, table, c)) exists.push(`\`${c}\``);
  }
  if (exists.length === 0) return [];
  const [rows] = await conn.query(`SELECT ${exists.join(", ")} FROM \`${table}\``);
  return rows;
}

async function hasTable(conn, table) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [table]
  );
  return rows.length > 0;
}

function firstNotEmpty(...values) {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
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

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const legacy = await mysql.createConnection({
    host: requiredEnv("LEGACY_DB_HOST"),
    port: Number(process.env.LEGACY_DB_PORT || "3306"),
    user: requiredEnv("LEGACY_DB_USER"),
    password: requiredEnv("LEGACY_DB_PASSWORD"),
    database: requiredEnv("LEGACY_DB_NAME"),
  });

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[1/5] Fetch legacy webinars/quizzes data...");
  const webinarsBase = await fetchRows(legacy, "webinars", [
    "id",
    "slug",
    "title",
    "type",
    "level",
    "start_date",
    "video_demo",
    "video_demo_source",
    "description",
    "teacher_id",
    "image_cover",
    "price",
    "status",
    "created_at",
  ]);
  const quizzesBase = await fetchRows(legacy, "quizzes", [
    "id",
    "webinar_id",
    "item_id",
    "title",
    "description",
    "time",
    "attempt",
    "pass_mark",
    "total_mark",
    "status",
    "created_at",
  ]);
  const questions = await fetchRows(legacy, "quizzes_questions", [
    "id",
    "quiz_id",
    "title",
    "type",
    "grade",
    "created_at",
  ]);
  const answers = await fetchRows(legacy, "quizzes_questions_answers", [
    "id",
    "question_id",
    "title",
    "correct",
    "created_at",
  ]);
  const quizResults = await fetchRows(legacy, "quizzes_results", [
    "id",
    "quiz_id",
    "user_id",
    "user_grade",
    "status",
    "results",
    "created_at",
  ]);

  const users = await fetchRows(legacy, "users", ["id", "full_name", "email"]);
  const userMap = new Map(users.map((u) => [Number(u.id), u]));

  const hasWebinarTranslations = await hasTable(legacy, "webinar_translations");
  const hasQuizTranslations = await hasTable(legacy, "quiz_translations");
  const hasQuestionTranslations = await hasTable(legacy, "quiz_question_translations");
  const hasAnswerTranslations = await hasTable(legacy, "quizzes_questions_answer_translations");

  const webinarTranslations = hasWebinarTranslations
    ? await fetchRows(legacy, "webinar_translations", ["webinar_id", "locale", "title", "description", "seo_description"])
    : [];
  const quizTranslations = hasQuizTranslations
    ? await fetchRows(legacy, "quiz_translations", ["quiz_id", "locale", "title"])
    : [];
  const questionTranslations = hasQuestionTranslations
    ? await fetchRows(legacy, "quiz_question_translations", ["quizzes_question_id", "locale", "title"])
    : [];
  const answerTranslations = hasAnswerTranslations
    ? await fetchRows(legacy, "quizzes_questions_answer_translations", ["quizzes_questions_answer_id", "locale", "title"])
    : [];

  const preferredLocales = ["vi", "vi_VN", "en"];
  function translationPick(rows, keyField, id, valueField = "title") {
    const items = rows.filter((r) => Number(r[keyField]) === Number(id));
    if (!items.length) return null;
    for (const locale of preferredLocales) {
      const hit = items.find((r) => String(r.locale || "").toLowerCase() === locale.toLowerCase() && r[valueField]);
      if (hit) return hit[valueField];
    }
    const any = items.find((r) => r[valueField]);
    return any ? any[valueField] : null;
  }

  console.log("[2/5] Upsert public course catalog...");
  const courseRows = webinarsBase
    .filter((row) => String(row.type || "course").toLowerCase() !== "webinar")
    .map((row) => ({
      legacy_webinar_id: Number(row.id),
      slug: row.slug ? String(row.slug) : `legacy-course-${row.id}-${slugify(translationPick(webinarTranslations, "webinar_id", row.id) || row.title || row.id)}`,
      title: String(firstNotEmpty(
        translationPick(webinarTranslations, "webinar_id", row.id, "title"),
        row.title,
        `Legacy course #${row.id}`
      )),
      short_description: firstNotEmpty(
        translationPick(webinarTranslations, "webinar_id", row.id, "seo_description"),
        row.description
      )
        ? String(firstNotEmpty(translationPick(webinarTranslations, "webinar_id", row.id, "seo_description"), row.description)).slice(0, 220)
        : null,
      description: firstNotEmpty(
        translationPick(webinarTranslations, "webinar_id", row.id, "description"),
        row.description
      )
        ? String(firstNotEmpty(translationPick(webinarTranslations, "webinar_id", row.id, "description"), row.description))
        : null,
      teacher_name: userMap.get(Number(row.teacher_id))?.full_name || null,
      thumbnail_url: row.image_cover ? String(row.image_cover) : null,
      demo_video_url: row.video_demo ? String(row.video_demo) : null,
      demo_video_source: row.video_demo_source ? String(row.video_demo_source) : null,
      level: row.level ? String(row.level) : null,
      price: Number(row.price || 0),
      currency: "VND",
      status: mapLegacyCourseStatus(row.status),
      published_at: row.start_date ? new Date(Number(row.start_date) * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (courseRows.length > 0) {
    const { error } = await supabase
      .from("public_courses")
      .upsert(courseRows, { onConflict: "legacy_webinar_id" });
    if (error) throw error;
  }

  console.log("[3/5] Upsert public quizzes/questions/options...");
  const quizRows = quizzesBase
    .filter((row) => row.id)
    .map((row) => ({
      legacy_quiz_id: Number(row.id),
      slug: `legacy-quiz-${row.id}-${slugify(translationPick(quizTranslations, "quiz_id", row.id) || row.title || row.id)}`,
      title: String(firstNotEmpty(
        translationPick(quizTranslations, "quiz_id", row.id, "title"),
        row.title,
        `Legacy quiz #${row.id}`
      )),
      description: row.description ? String(row.description) : null,
      time_limit_minutes: row.time ? Number(row.time) : null,
      pass_mark: Number(row.pass_mark || 0),
      total_mark: Number(row.total_mark || 0),
      is_active: String(row.status || "").toLowerCase() === "active",
      updated_at: new Date().toISOString(),
    }));

  if (quizRows.length > 0) {
    const { error } = await supabase
      .from("public_quizzes")
      .upsert(quizRows, { onConflict: "legacy_quiz_id" });
    if (error) throw error;
  }

  const { data: mappedQuizzes, error: qMapErr } = await supabase
    .from("public_quizzes")
    .select("id,legacy_quiz_id");
  if (qMapErr) throw qMapErr;
  const quizMap = new Map((mappedQuizzes || []).map((q) => [Number(q.legacy_quiz_id), q.id]));

  const questionRows = questions
    .filter((row) => quizMap.has(Number(row.quiz_id)))
    .map((row) => ({
      legacy_question_id: Number(row.id),
      quiz_id: quizMap.get(Number(row.quiz_id)),
      question_text: String(firstNotEmpty(
        translationPick(questionTranslations, "quizzes_question_id", row.id, "title"),
        row.title,
        `Question #${row.id}`
      )),
      question_type: String(row.type || "multiple"),
      grade: Number(row.grade || 1),
      sort_order: Number(row.id),
    }))
    .filter((q) => q.question_text);

  if (questionRows.length > 0) {
    const { error } = await supabase
      .from("public_quiz_questions")
      .upsert(questionRows, { onConflict: "legacy_question_id" });
    if (error) throw error;
  }

  const { data: mappedQuestions, error: qqMapErr } = await supabase
    .from("public_quiz_questions")
    .select("id,legacy_question_id");
  if (qqMapErr) throw qqMapErr;
  const questionMap = new Map((mappedQuestions || []).map((q) => [Number(q.legacy_question_id), q.id]));

  const optionRows = answers
    .filter((row) => questionMap.has(Number(row.question_id)))
    .map((row) => ({
      legacy_answer_id: Number(row.id),
      question_id: questionMap.get(Number(row.question_id)),
      option_text: String(firstNotEmpty(
        translationPick(answerTranslations, "quizzes_questions_answer_id", row.id, "title"),
        row.title,
        `Option #${row.id}`
      )),
      is_correct: !!row.correct,
      sort_order: Number(row.id),
    }))
    .filter((opt) => opt.option_text);

  if (optionRows.length > 0) {
    const { error } = await supabase
      .from("public_quiz_options")
      .upsert(optionRows, { onConflict: "legacy_answer_id" });
    if (error) throw error;
  }

  console.log("[4/5] Migrate quiz results for users present in Supabase...");
  if (quizResults.length > 0) {
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id");
    if (profilesError) throw profilesError;
    const validUsers = new Set((profiles || []).map((p) => p.id));

    const attemptRows = quizResults
      .filter((row) => quizMap.has(Number(row.quiz_id)) && row.user_id && validUsers.has(String(row.user_id)))
      .map((row) => ({
        quiz_id: quizMap.get(Number(row.quiz_id)),
        user_id: String(row.user_id),
        score: Number(row.user_grade || 0),
        max_score: Number(quizzesBase.find((q) => Number(q.id) === Number(row.quiz_id))?.total_mark || 0),
        status: mapAttemptStatus(row.status),
        answers: row.results ? row.results : {},
        submitted_at: row.created_at ? new Date(Number(row.created_at) * 1000).toISOString() : new Date().toISOString(),
      }));

    if (attemptRows.length > 0) {
      const { error } = await supabase.from("public_quiz_attempts").insert(attemptRows);
      if (error) throw error;
    }
  }

  console.log("[5/5] Summary");
  console.log(`Courses upserted: ${courseRows.length}`);
  console.log(`Quizzes upserted: ${quizRows.length}`);
  console.log(`Questions upserted: ${questionRows.length}`);
  console.log(`Options upserted: ${optionRows.length}`);
  console.log(`Attempts inserted: ${quizResults.length}`);

  await legacy.end();
  console.log("Done. Public courses/quizzes migrated successfully.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
