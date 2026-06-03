import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function isSessionInMonth(sessionDate, targetMonth) {
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

async function main() {
  // Let's search for "Cao Ngoc Y" or "Cao Ngọc Ý" across all classes
  const { data: students } = await supabase.from("students").select("*");
  const student = students.find(s => s.full_name.includes("Cao Ngoc Y") || s.full_name.includes("Ngọc Ý"));
  
  if (!student) {
    console.log("Student not found!");
    return;
  }
  console.log(`Found student: ${student.full_name} | ID: ${student.id}`);

  // Find all enrollments
  const { data: enrollments } = await supabase.from("enrollments").select("class_id, classes(*)").eq("student_id", student.id);
  console.log("\n=== ENROLLMENTS ===");
  enrollments?.forEach(e => {
    console.log(`Class ID: ${e.class_id} | Name: ${e.classes?.name}`);
  });

  for (const e of enrollments || []) {
    const classId = e.class_id;
    console.log(`\n===================`);
    console.log(`Class: ${e.classes?.name} | ID: ${classId}`);
    
    // Fetch sessions
    const { data: sessions } = await supabase.from("sessions").select("*").eq("class_id", classId);
    console.log(`Total sessions in class: ${sessions?.length || 0}`);

    // Group sessions by month
    const months = new Set();
    sessions?.forEach(s => {
      if (s.session_date) {
        const parts = s.session_date.split("/");
        if (parts.length === 3) {
          months.add(`${parts[2]}-${parts[1].padStart(2, "0")}`);
        }
      }
    });

    console.log("Available months in sessions:", Array.from(months));

    for (const m of Array.from(months).sort()) {
      console.log(`\n--- Month: ${m} ---`);
      
      // Filter sessions belonging to target month
      const monthSessions = sessions.filter(s => isSessionInMonth(s.session_date, m));
      const sessionIds = monthSessions.map(s => s.id);
      
      console.log(`Sessions in ${m}: ${monthSessions.length}`);
      monthSessions.forEach(s => {
        console.log(`  Session ${s.session_no} | Date: ${s.session_date} | Status: ${s.status} | ID: ${s.id}`);
      });

      let sessionsAttendance = [];
      if (sessionIds.length > 0) {
        const { data: attData } = await supabase
          .from("session_attendance")
          .select("*")
          .in("session_id", sessionIds);
        sessionsAttendance = attData || [];
      }

      // Filter student's attendance records in target month
      const studentAtts = sessionsAttendance.filter(a => 
        (a.student_id === student.id) || 
        (a.student_name && a.student_name.trim().toLowerCase() === student.full_name.trim().toLowerCase())
      );

      // Deduplicate
      const attMap = new Map();
      studentAtts.forEach(a => {
        const key = String(a.session_id || a.session_ref || `${a.class_name}_${a.session_no}`);
        const existing = attMap.get(key);
        if (!existing || (a.session_id && !existing.session_id)) {
          attMap.set(key, a);
        }
      });
      const uniqueStudentAtts = Array.from(attMap.values());

      const courseClasses = monthSessions.filter(s => s.status !== "CANCELLED").length;
      const teacherCancellation = monthSessions.filter(s => s.status === "CANCELLED").length;

      const attendanceCount = uniqueStudentAtts.filter(a => a.attendance_status === "on_time").length;
      const studentCancellation = uniqueStudentAtts.filter(a => a.attendance_status === "absent").length;

      console.log(`Attendance records found for student: ${uniqueStudentAtts.length}`);
      uniqueStudentAtts.forEach(a => {
        console.log(`  Att Session ID: ${a.session_id} | Status: ${a.attendance_status} | Name in Att: ${a.student_name}`);
      });

      console.log(`Calculated stats for ${m}:`);
      console.log(`  Course classes (Dự tính): ${courseClasses}`);
      console.log(`  Attendance (Thực tế): ${attendanceCount}`);
      console.log(`  Student Cancellation (Học viên nghỉ): ${studentCancellation}`);
      console.log(`  Teacher Cancellation (Giáo viên nghỉ): ${teacherCancellation}`);
    }
  }
}

main().catch(console.error);
