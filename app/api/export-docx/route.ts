import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

// Helper to determine if a session falls within the target month (YYYY-MM)
function isSessionInMonth(sessionDate: string | null, targetMonth: string): boolean {
  if (!sessionDate) return false;
  const parts = sessionDate.split("/");
  if (parts.length !== 3) return false;
  
  const sessionMonth = parseInt(parts[1], 10);
  const sessionYear = parseInt(parts[2], 10);
  
  const targetParts = targetMonth.split("-");
  if (targetParts.length !== 2) return false;
  const targetYear = parseInt(targetParts[0], 10);
  const targetMonthNum = parseInt(targetParts[1], 10);
  
  return sessionMonth === targetMonthNum && sessionYear === targetYear;
}

// Generate the customized DOCX buffer for a single student
async function generateDocx(templateBuf: Buffer, studentData: any): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuf);
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("word/document.xml missing in docx zip");
  
  let xml = await docXml.async("string");

  // Helper to replace simple strings
  const replaceText = (search: string, replace: string) => {
    xml = xml.replaceAll(search, replace || "");
  };

  // 1. Replace TABLE 1 fields
  replaceText("IELTS ROCKET", studentData.className);
  replaceText("An Qúy", studentData.studentName);
  replaceText("Cô Anh Thư", studentData.teacherName || "Giáo viên");
  replaceText("Tháng thứ nhất", studentData.monthLabel);

  // 2. Replace TABLE 2 fields (attendance metrics)
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
    let cellMatch;
    const cells: string[] = [];
    while ((cellMatch = cellRegex.exec(gvvnRowXml)) !== null) {
      cells.push(cellMatch[0]);
    }

    if (cells.length === 6) {
      const newCells = [
        cells[0], // GVVN
        cells[1].replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/, `<w:t xml:space="preserve">${studentData.stats.courseClasses}</w:t>`),
        cells[2].replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/, `<w:t xml:space="preserve">${studentData.stats.attendance}</w:t>`),
        cells[3].replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/, `<w:t xml:space="preserve">${studentData.stats.studentCancellation}</w:t>`),
        cells[4].replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/, `<w:t xml:space="preserve">${studentData.stats.teacherCancellation}</w:t>`),
        cells[5].replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/, `<w:t xml:space="preserve">${studentData.stats.makeupClasses}</w:t>`),
      ];
      const newRowXml = gvvnRowXml.replace(cells.join(""), newCells.join(""));
      xml = xml.replace(gvvnRowXml, newRowXml);
    }
  }

  // 3. Replace TABLE 3 fields (detailed evaluations)
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
    let rowMatch;
    const tbl3Rows: string[] = [];
    while ((rowMatch = rowRegex.exec(tbl3Xml)) !== null) {
      tbl3Rows.push(rowMatch[0]);
    }

    if (tbl3Rows.length === 9) {
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
            
            const colorAttr = isComment ? `<w:color w:val="1f1f1f"/><w:highlight w:val="white"/>` : "";
            
            return `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>${colorAttr}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${cleanLine}</w:t></w:r></w:p>`;
          })
          .join("");
      };

      const replaceCellParagraphs = (rowXml: string, newParagraphsXml: string) => {
        const tcPrMatch = rowXml.match(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/);
        if (tcPrMatch) {
          const prefix = rowXml.substring(0, rowXml.indexOf("</w:tcPr>") + 9);
          return prefix + newParagraphsXml + "</w:tc></w:tr>";
        }
        return rowXml;
      };

      const newRow3 = replaceCellParagraphs(tbl3Rows[2], makeParagraphsXml(studentData.eval.knowledgeLearned));
      const newRow5 = replaceCellParagraphs(tbl3Rows[4], makeParagraphsXml(studentData.eval.teacherComment, true));
      const newRow7 = replaceCellParagraphs(tbl3Rows[6], makeParagraphsXml(studentData.eval.nextMonthPlan));
      
      const testResultText = `Trình độ hiện tại: ${studentData.eval.testResult || "Chưa cập nhật"}`;
      const newRow9 = replaceCellParagraphs(tbl3Rows[8], makeParagraphsXml(testResultText));

      const newTbl3Xml = tbl3Xml
        .replace(tbl3Rows[2], newRow3)
        .replace(tbl3Rows[4], newRow5)
        .replace(tbl3Rows[6], newRow7)
        .replace(tbl3Rows[8], newRow9);

      xml = xml.replace(tbl3Xml, newTbl3Xml);
    }
  }

  zip.file("word/document.xml", xml);
  return await zip.generateAsync({ type: "nodebuffer" });
}

// GET handler
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const month = searchParams.get("month"); // e.g. "2026-05"
    const studentId = searchParams.get("studentId") || "all";

    if (!classId || !month) {
      return NextResponse.json({ error: "Missing classId or month" }, { status: 400 });
    }

    const templatePath = "c:\\Users\\admin\\Downloads\\AG_AI\\RIG1 - BCHL tháng thứ nhất - An Qúy .docx";
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "Template Word document not found at: " + templatePath }, { status: 404 });
    }
    const templateBuf = fs.readFileSync(templatePath);

    const supabase = await createServerSupabaseClient();

    // 1. Fetch class details
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

    // 2. Fetch enrolled active students in the class
    const { data: enrolledData, error: enrolledErr } = await supabase
      .from("enrollments")
      .select("student_id, students:students!inner(id, student_code, full_name, email, phone)")
      .eq("class_id", classId)
      .eq("status", "active");

    if (enrolledErr || !enrolledData || enrolledData.length === 0) {
      return NextResponse.json({ error: "No students enrolled in class" }, { status: 404 });
    }

    // Filter by studentId if a specific student is requested
    const targetEnrollments = studentId === "all"
      ? enrolledData
      : enrolledData.filter(e => e.student_id === studentId);

    if (targetEnrollments.length === 0) {
      return NextResponse.json({ error: "Selected student is not in this class" }, { status: 404 });
    }

    // 3. Fetch monthly evaluations for these students in this month
    const { data: monthlyEvals, error: evalsErr } = await supabase
      .from("monthly_student_evaluations")
      .select("*")
      .eq("class_id", classId)
      .eq("evaluation_month", month);

    // 4. Fetch all sessions of the class
    const { data: sessions, error: sessionsErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("class_id", classId);

    const classSessions = (sessions || []) as any[];

    // Determine the actual sessions to use for calculating attendance statistics.
    // We check if the evaluation month specifies a session range, e.g. "Tháng thứ 1 (Buổi 1-8)".
    // If it does, we filter sessions strictly by session_no range.
    // Otherwise, we filter by target calendar month with dynamic fallback to the latest active month.
    let monthSessions = [];
    const rangeMatch = month.match(/(?:Buổi|Session)\s*(\d+)\s*-\s*(\d+)/i);

    if (rangeMatch) {
      const startNo = parseInt(rangeMatch[1], 10);
      const endNo = parseInt(rangeMatch[2], 10);
      console.log(`[export-docx] Class ID: ${classId} | Evaluation Month specifies session range: ${startNo} - ${endNo}`);
      monthSessions = classSessions.filter(s => s.session_no !== null && s.session_no >= startNo && s.session_no <= endNo);
    } else {
      let statsMonth = month;
      const monthsWithDoneSessions = new Set<string>();
      const monthsWithAnySessions = new Set<string>();

      classSessions.forEach(s => {
        if (s.session_date) {
          const parts = s.session_date.split("/");
          if (parts.length === 3) {
            const mStr = parts[1].padStart(2, "0");
            const yStr = parts[2];
            const sessionMonth = `${yStr}-${mStr}`;
            monthsWithAnySessions.add(sessionMonth);
            if (s.status === "DONE") {
              monthsWithDoneSessions.add(sessionMonth);
            }
          }
        }
      });

      const hasDoneSessionsInTargetMonth = classSessions.some(s => s.status === "DONE" && isSessionInMonth(s.session_date, month));

      if (!hasDoneSessionsInTargetMonth) {
        if (monthsWithDoneSessions.size > 0) {
          const sorted = Array.from(monthsWithDoneSessions).sort().reverse();
          statsMonth = sorted[0];
        } else if (monthsWithAnySessions.size > 0 && !monthsWithAnySessions.has(month)) {
          const sorted = Array.from(monthsWithAnySessions).sort().reverse();
          statsMonth = sorted[0];
        }
      }

      console.log(`[export-docx] Class ID: ${classId} | Evaluation Month: ${month} | Resolved Stats Month: ${statsMonth}`);

      // Filter sessions belonging to the resolved statistics month
      monthSessions = classSessions.filter(s => isSessionInMonth(s.session_date, statsMonth));
    }

    const sessionIds = monthSessions.map(s => s.id);

    // Fetch attendance for these sessions
    let sessionsAttendance: any[] = [];
    if (sessionIds.length > 0) {
      const { data: attData } = await supabase
        .from("session_attendance")
        .select("student_id, student_name, attendance_status, session_id, class_name, session_ref")
        .in("session_id", sessionIds);
      sessionsAttendance = attData || [];
    }

    // Fetch attendance makeups
    const { data: makeupData } = await supabase
      .from("attendance_makeup")
      .select("*");
    const allMakeups = makeupData || [];

    // Parse month label (e.g. "2026-05" -> "Tháng 05 năm 2026")
    const monthParts = month.split("-");
    const monthLabel = `Tháng ${monthParts[1]} năm ${monthParts[2] || monthParts[0]}`;

    // Map all sessions status to resolve target makeups
    const allSessionsStatus: Record<string, string> = {};
    classSessions.forEach(s => {
      const key1 = `${s.class_name}#${s.session_no}#${s.session_date}`;
      const key2 = `${s.class_name}__${s.session_no}__${s.session_date}`;
      allSessionsStatus[key1] = s.status;
      allSessionsStatus[key2] = s.status;
    });

    // Process students reports
    const reportsToGenerate = [];

    for (const enrol of targetEnrollments) {
      const student = enrol.students as any;
      if (!student) continue;

      const evalData = (monthlyEvals || []).find(e => e.student_id === student.id) || {};

      // Calculate attendance statistics in target month
      const courseClasses = monthSessions.filter(s => s.status !== "CANCELLED").length;
      const teacherCancellation = monthSessions.filter(s => s.status === "CANCELLED").length;

      // Filter student's attendance records in target month (matching ID or Name case-insensitively)
      const studentAtts = sessionsAttendance.filter(a => 
        (a.student_id === student.id) || 
        (a.student_name && a.student_name.trim().toLowerCase() === student.full_name.trim().toLowerCase())
      );
      
      // Deduplicate attendance records by composite key (session_id, session_ref, or session_no)
      const attMap = new Map<string, any>();
      studentAtts.forEach(a => {
        const key = String(a.session_id || a.session_ref || `${a.class_name}_${a.session_no}`);
        const existing = attMap.get(key);
        if (!existing || (a.session_id && !existing.session_id)) {
          attMap.set(key, a);
        }
      });
      const uniqueStudentAtts = Array.from(attMap.values());

      const attendanceCount = uniqueStudentAtts.filter(a => a.attendance_status === "on_time").length;
      const studentCancellation = uniqueStudentAtts.filter(a => a.attendance_status === "absent").length;

      // Completed makeups for this student where the missed session belongs to this month's sessions
      const monthSessionRefs = new Set(monthSessions.map(s => `${s.class_name}#${s.session_no}#${s.session_date}`));
      const monthSessionRefsLegacy = new Set(monthSessions.map(s => `${s.class_name}__${s.session_no}__${s.session_date}`));
      
      const studentMakeups = allMakeups.filter(m => {
        const isStudent = m.student_name?.trim().toLowerCase() === student.full_name?.trim().toLowerCase();
        if (!isStudent) return false;
        
        const isMonthSession = monthSessionRefs.has(m.session_ref) || monthSessionRefsLegacy.has(m.session_ref);
        if (!isMonthSession) return false;
        
        const isCompleted = m.is_completed || m.completed_at || (m.target_session_ref && allSessionsStatus[m.target_session_ref] === "DONE");
        return isCompleted;
      }).length;

      reportsToGenerate.push({
        studentName: student.full_name,
        className: classDetail.name,
        teacherName: teacherName,
        monthLabel: monthLabel,
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
        }
      });
    }

    if (studentId !== "all" && reportsToGenerate.length === 1) {
      // Export single DOCX file
      const report = reportsToGenerate[0];
      const docxBuf = await generateDocx(templateBuf, report);

      // Clean ASCII string filename or encode properly
      const safeName = report.studentName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const filename = `BCHL_${monthParts[1]}_${safeName}.docx`;

      return new NextResponse(docxBuf as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
        }
      });
    } else {
      // Export multiple files in a ZIP archive
      const zip = new JSZip();
      
      for (const report of reportsToGenerate) {
        const docxBuf = await generateDocx(templateBuf, report);
        const safeName = report.studentName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
        zip.file(`BCHL_Thang_${monthParts[1]}_${safeName}.docx`, docxBuf);
      }

      const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
      const safeClassName = classDetail.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const zipFilename = `Bao_Cao_Hoc_Luc_${safeClassName}_Thang_${monthParts[1]}.zip`;

      return new NextResponse(zipBuf as any, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipFilename}"`,
        }
      });
    }
  } catch (err: any) {
    console.error("[export-docx Error]", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
