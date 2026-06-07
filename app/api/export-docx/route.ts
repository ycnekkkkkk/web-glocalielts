import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  findBchlTemplateOnDrive,
  getDriveFileContent,
  isDriveConfigured,
} from "@/lib/google/drive";

// ── Month / cycle label parsing ─────────────────────────────────────────────

function parseEvaluationMonth(month: string): {
  kind: "calendar" | "cycle";
  rawLabel: string;
  monthLabel: string;
  cycleRange: { start: number; end: number } | null;
  calendarMonth: string | null;
} {
  const trimmed = month.trim();

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [year, m] = trimmed.split("-");
    return {
      kind: "calendar",
      rawLabel: trimmed,
      monthLabel: `Tháng ${parseInt(m, 10)} năm ${year}`,
      cycleRange: null,
      calendarMonth: trimmed,
    };
  }

  const cycleMatch = trimmed.match(/^Tháng thứ (\d+)\s*\(?\s*Buổi\s*(\d+)\s*-\s*(\d+)/);
  if (cycleMatch) {
    return {
      kind: "cycle",
      rawLabel: trimmed,
      monthLabel: `Tháng thứ ${parseInt(cycleMatch[1], 10)} (Buổi ${parseInt(cycleMatch[2], 10)}-${parseInt(cycleMatch[3], 10)})`,
      cycleRange: { start: parseInt(cycleMatch[2], 10), end: parseInt(cycleMatch[3], 10) },
      calendarMonth: null,
    };
  }

  const ordinalMap: Record<string, string> = {
    "thứ nhất": "1", "thứ hai": "2", "thứ ba": "3",
    "thứ tư": "4", "thứ năm": "5", "thứ sáu": "6",
    "thứ bảy": "7", "thứ tám": "8", "thứ chín": "9",
    "thứ mười": "10",
  };
  const lower = trimmed.toLowerCase();
  for (const [ordinal, num] of Object.entries(ordinalMap)) {
    if (lower.startsWith(`tháng ${ordinal}`)) {
      return {
        kind: "cycle",
        rawLabel: trimmed,
        monthLabel: trimmed,
        cycleRange: null,
        calendarMonth: null,
      };
    }
  }

  return {
    kind: "cycle",
    rawLabel: trimmed,
    monthLabel: trimmed,
    cycleRange: null,
    calendarMonth: null,
  };
}

function isSessionInMonth(
  session: { session_date: string | null; session_no: number | null },
  parsed: ReturnType<typeof parseEvaluationMonth>
): boolean {
  if (parsed.kind === "calendar" && parsed.calendarMonth) {
    if (!session.session_date) return false;
    const parts = session.session_date.split("/");
    if (parts.length !== 3) return false;
    const sessionMonth = `${parts[2]}-${parts[1].padStart(2, "0")}`;
    return sessionMonth === parsed.calendarMonth;
  }
  if (parsed.kind === "cycle" && parsed.cycleRange) {
    if (session.session_no == null) return false;
    return (
      session.session_no >= parsed.cycleRange.start &&
      session.session_no <= parsed.cycleRange.end
    );
  }
  return false;
}

// ── Template discovery ─────────────────────────────────────────────────────

async function fetchTemplateFromDrive(
  className: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  if (!isDriveConfigured()) return null;

  const folderId =
    process.env.BCHL_TEMPLATE_FOLDER_ID?.trim() ||
    process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  if (!folderId) return null;

  const match = await findBchlTemplateOnDrive(className, folderId);
  if (!match) return null;

  try {
    const { buffer } = await getDriveFileContent(match.fileId);
    return { buffer, fileName: match.fileName };
  } catch (e) {
    console.error("[export-docx] Failed to download template from Drive:", match.fileName, e);
    return null;
  }
}

// ── DOCX population ──────────────────────────────────────────────────────────

async function populateDocx(
  templateBuf: Buffer,
  studentData: {
    studentName: string;
    className: string;
    courseName: string;
    teacherName: string;
    monthLabel: string;
    stats: {
      courseClasses: number;
      attendance: number;
      studentCancellation: number;
      teacherCancellation: number;
      makeupClasses: number;
    };
    eval: {
      knowledgeLearned: string;
      teacherComment: string;
      nextMonthPlan: string;
      testResult: string;
    };
  }
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuf);

  const docXml = await zip.file("word/document.xml");
  if (!docXml) throw new Error("word/document.xml missing in docx zip");

  let xml = await docXml.async("string");

  // Replace simple string placeholders
  xml = xml.replaceAll("IELTS ROCKET", studentData.courseName || "IELTS ROCKET");
  xml = xml.replaceAll("An Qúy", studentData.studentName);
  xml = xml.replaceAll("Cô Anh Thư", studentData.teacherName || "Giáo viên");
  xml = xml.replaceAll("Tháng thứ nhất", studentData.monthLabel);

  // Replace stats row (GVVN row — 6 cells)
  const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
  let trMatch;
  let gvvnRowXml: string | null = null;

  while ((trMatch = trRegex.exec(xml)) !== null) {
    if (trMatch[1].includes("GVVN")) {
      gvvnRowXml = trMatch[0];
      break;
    }
  }

  if (gvvnRowXml) {
    const cellRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(gvvnRowXml)) !== null) {
      cells.push(cellMatch[0]);
    }

    if (cells.length === 6) {
      const replaceCell = (cellXml: string, value: string) =>
        cellXml.replace(
          /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/,
          `<w:t xml:space="preserve">${value}</w:t>`
        );

      const newCells = [
        cells[0],
        replaceCell(cells[1], String(studentData.stats.courseClasses)),
        replaceCell(cells[2], String(studentData.stats.attendance)),
        replaceCell(cells[3], String(studentData.stats.studentCancellation)),
        replaceCell(cells[4], String(studentData.stats.teacherCancellation)),
        replaceCell(cells[5], String(studentData.stats.makeupClasses)),
      ];

      xml = xml.replace(gvvnRowXml, gvvnRowXml.replace(cells.join(""), newCells.join("")));
    }
  }

  // Replace detailed evaluation table (TABLE 3 — find by label row)
  const tblRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
  let tblMatch;
  let tbl3Xml: string | null = null;

  while ((tblMatch = tblRegex.exec(xml)) !== null) {
    if (tblMatch[0].includes("Knowledge the student has learned")) {
      tbl3Xml = tblMatch[0];
      break;
    }
  }

  if (tbl3Xml) {
    const rowRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    const rows: string[] = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tbl3Xml)) !== null) {
      rows.push(rowMatch[0]);
    }

    if (rows.length >= 9) {
      const makeParagraphsXml = (text: string | null, isComment = false) => {
        const value = (text || "").trim();
        if (!value) {
          return `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:i w:val="1"/><w:iCs w:val="1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Chưa cập nhật</w:t></w:r></w:p>`;
        }

        return value
          .split("\n")
          .map(line => {
            const cleanLine = line
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const colorAttr = isComment
              ? `<w:color w:val="1f1f1f"/><w:highlight w:val="white"/>`
              : "";

            return `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>${colorAttr}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${cleanLine}</w:t></w:r></w:p>`;
          })
          .join("");
      };

      const replaceCellContent = (rowXml: string, newParagraphsXml: string) => {
        const tcPrEnd = rowXml.indexOf("</w:tcPr>") + 9;
        if (tcPrEnd === -1) return rowXml;
        const prefix = rowXml.substring(0, tcPrEnd);
        return prefix + newParagraphsXml + "</w:tc></w:tr>";
      };

      const testResultText = `Trình độ hiện tại: ${studentData.eval.testResult || "Chưa cập nhật"}`;

      let newTbl3Xml = tbl3Xml;
      newTbl3Xml = newTbl3Xml.replace(
        rows[2],
        replaceCellContent(rows[2], makeParagraphsXml(studentData.eval.knowledgeLearned))
      );
      newTbl3Xml = newTbl3Xml.replace(
        rows[4],
        replaceCellContent(rows[4], makeParagraphsXml(studentData.eval.teacherComment, true))
      );
      newTbl3Xml = newTbl3Xml.replace(
        rows[6],
        replaceCellContent(rows[6], makeParagraphsXml(studentData.eval.nextMonthPlan))
      );
      newTbl3Xml = newTbl3Xml.replace(
        rows[8],
        replaceCellContent(rows[8], makeParagraphsXml(testResultText))
      );

      xml = xml.replace(tbl3Xml, newTbl3Xml);
    }
  }

  zip.file("word/document.xml", xml);
  return await zip.generateAsync({ type: "nodebuffer" });
}

// ── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const studentId = searchParams.get("studentId") || "all";

    if (!classId || !month) {
      return NextResponse.json({ error: "Missing classId or month" }, { status: 400 });
    }

    const parsedMonth = parseEvaluationMonth(month);
    const supabase = await createServerSupabaseClient();

    // 1. Fetch class details (needed for template discovery + teacher name)
    const { data: classData, error: classErr } = await supabase
      .from("classes")
      .select("id, name, teacher_id, teacher:profiles!teacher_id(full_name)")
      .eq("id", classId)
      .maybeSingle();

    if (classErr || !classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const classDetail = classData as any;
    const teacherName = classDetail.teacher?.full_name || "–";

    // Parse optional course name from query params
    const courseName = searchParams.get("courseName")?.trim() || "";

    // 2. Fetch the Word template for this class from Google Drive
    const template = await fetchTemplateFromDrive(classDetail.name);

    if (!template) {
      const folderHint = process.env.BCHL_TEMPLATE_FOLDER_ID
        ? "BCHL_TEMPLATE_FOLDER_ID"
        : process.env.GOOGLE_DRIVE_FOLDER_ID
        ? "GOOGLE_DRIVE_FOLDER_ID"
        : null;

      const hint = folderHint
        ? ` Đảm bảo biến ${folderHint} trong .env.local trỏ đúng thư mục chứa template trên Google Drive.`
        : " Vui lòng thêm BCHL_TEMPLATE_FOLDER_ID vào .env.local (lấy ID từ URL thư mục Google Drive).";

      return NextResponse.json(
        {
          error: `Không tìm thấy file mẫu BCHL cho lớp "${classDetail.name}" trên Google Drive.`
            + ` Vui lòng tải file .docx mẫu (chứa tên lớp trong tên file, ví dụ "${classDetail.name}.docx")`
            + ` lên thư mục BCHL Templates trên Google Drive.${hint}`,
        },
        { status: 404 }
      );
    }

    const templateBuf = template.buffer;

    // 3. Fetch enrolled active students in the class
    const { data: enrolledData, error: enrolledErr } = await supabase
      .from("enrollments")
      .select("student_id, students:students!inner(id, student_code, full_name, email, phone)")
      .eq("class_id", classId)
      .eq("status", "active");

    if (enrolledErr || !enrolledData || enrolledData.length === 0) {
      return NextResponse.json({ error: "No students enrolled in class" }, { status: 404 });
    }

    const targetEnrollments =
      studentId === "all"
        ? enrolledData
        : enrolledData.filter((e: any) => e.student_id === studentId);

    if (targetEnrollments.length === 0) {
      return NextResponse.json(
        { error: "Selected student is not in this class" },
        { status: 404 }
      );
    }

    // 4. Fetch monthly evaluations using the raw label
    const { data: monthlyEvals } = await supabase
      .from("monthly_student_evaluations")
      .select("*")
      .eq("class_id", classId)
      .eq("evaluation_month", parsedMonth.rawLabel);

    // 5. Fetch all sessions of the class
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("class_id", classId);

    const classSessions = (sessions || []) as Array<{
      id: string;
      class_name: string;
      session_no: number | null;
      session_date: string | null;
      status: string | null;
    }>;

    // 6. Filter sessions belonging to the evaluation period
    const monthSessions = classSessions.filter(s => isSessionInMonth(s, parsedMonth));
    const sessionIds = monthSessions.map(s => s.id);

    // 7. Fetch attendance
    let sessionsAttendance: any[] = [];
    if (sessionIds.length > 0) {
      const { data: attData } = await supabase
        .from("session_attendance")
        .select(
          "student_id, student_name, attendance_status, session_id, class_name, session_ref"
        )
        .in("session_id", sessionIds);
      sessionsAttendance = attData || [];
    }

    // 8. Fetch makeups
    const { data: makeupData } = await supabase.from("attendance_makeup").select("*");
    const allMakeups = makeupData || [];

    // Build a lookup map for existing session statuses
    const allSessionsStatus: Record<string, string> = {};
    classSessions.forEach(s => {
      allSessionsStatus[`${s.class_name}#${s.session_no}#${s.session_date}`] = s.status || "";
      allSessionsStatus[`${s.class_name}__${s.session_no}__${s.session_date}`] = s.status || "";
    });

    // 9. Build per-student report data
    const reports = targetEnrollments
      .map((enrol: any) => {
        const student = enrol.students;
        if (!student) return null;

        const evalData =
          (monthlyEvals || []).find((e: any) => e.student_id === student.id) || {};

        const courseClasses = monthSessions.filter(s => s.status !== "CANCELLED").length;
        const teacherCancellation = monthSessions.filter(
          s => s.status === "CANCELLED"
        ).length;

        // Deduplicate attendance by session key (prefer rows with session_id)
        const studentAtts = (sessionsAttendance || []).filter(
          (a: any) =>
            a.student_id === student.id ||
            (a.student_name &&
              a.student_name.trim().toLowerCase() ===
                student.full_name.trim().toLowerCase())
        );

        const attMap = new Map<string, any>();
        studentAtts.forEach((a: any) => {
          const key = String(
            a.session_id || a.session_ref || `${a.class_name}_${a.session_no}`
          );
          const existing = attMap.get(key);
          if (!existing || (a.session_id && !existing.session_id)) {
            attMap.set(key, a);
          }
        });

        const attendanceCount = Array.from(attMap.values()).filter(
          (a: any) => a.attendance_status === "on_time"
        ).length;
        const studentCancellation = Array.from(attMap.values()).filter(
          (a: any) => a.attendance_status === "absent"
        ).length;

        // Count completed makeups for this month
        const monthRefs = new Set(
          monthSessions.map(
            s => `${s.class_name}#${s.session_no}#${s.session_date}`
          )
        );
        const monthRefsLegacy = new Set(
          monthSessions.map(
            s => `${s.class_name}__${s.session_no}__${s.session_date}`
          )
        );

        const studentMakeups = allMakeups.filter((m: any) => {
          const isStudent =
            m.student_name?.trim().toLowerCase() ===
            student.full_name?.trim().toLowerCase();
          if (!isStudent) return false;
          if (!monthRefs.has(m.session_ref) && !monthRefsLegacy.has(m.session_ref))
            return false;
          return (
            m.is_completed ||
            m.completed_at ||
            (m.target_session_ref &&
              allSessionsStatus[m.target_session_ref] === "DONE")
          );
        }).length;

        return {
          studentName: student.full_name,
          className: classDetail.name,
          courseName,
          teacherName,
          monthLabel: parsedMonth.monthLabel,
          stats: {
            courseClasses,
            attendance: attendanceCount,
            studentCancellation,
            teacherCancellation,
            makeupClasses: studentMakeups,
          },
          eval: {
            knowledgeLearned: evalData.knowledge_learned || "",
            teacherComment: evalData.teacher_comment || "",
            nextMonthPlan: evalData.next_month_plan || "",
            testResult: evalData.test_result || "",
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (reports.length === 0) {
      return NextResponse.json({ error: "No report data found" }, { status: 404 });
    }

    // 10. Generate output
    const safeName = (name: string) =>
      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

    if (studentId !== "all" && reports.length === 1) {
      const docxBuf = await populateDocx(templateBuf, reports[0]!);
      return new NextResponse(docxBuf as unknown as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="BCHL_${safeName(reports[0]!.studentName)}.docx"`,
        },
      });
    } else {
      const bundle = new JSZip();
      for (const r of reports) {
        const docxBuf = await populateDocx(templateBuf, r);
        bundle.file(`BCHL_${safeName(r.studentName)}.docx`, docxBuf);
      }
      const zipBuf = await bundle.generateAsync({ type: "nodebuffer" });
      return new NextResponse(zipBuf as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="Bao_Cao_Hoc_Luc_${safeName(classDetail.name)}.zip"`,
        },
      });
    }
  } catch (err: any) {
    console.error("[export-docx Error]", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
