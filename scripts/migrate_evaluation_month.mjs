/**
 * Migration script: Chuyen evaluation_month tu format "Chu Ky"
 * ("Chu kỳ 1", "Chu kỳ 2", ...)
 * sang format "Thang thu"
 * ("Tháng thứ 1", "Tháng thứ 2", ...)
 *
 * Run: node migrate_evaluation_month.mjs
 */

const SUPABASE_URL = "https://nbdaxrfqdlezdmnhbtjz.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZGF4cmZxZGxlemRtbmhidGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mzc5NSwiZXhwIjoyMDkwMzQ5Nzk1fQ.87DY474yliLrK71QiIC_q3gka6JM-6fz8jji4AvAR3s";

// Map tu format cu -> format moi
const mapping = {
  "Chu kỳ 1 (Buổi 1-8)":   "Tháng thứ 1 (Buổi 1-8)",
  "Chu kỳ 2 (Buổi 9-16)":  "Tháng thứ 2 (Buổi 9-16)",
  "Chu kỳ 3 (Buổi 17-24)": "Tháng thứ 3 (Buổi 17-24)",
  "Chu kỳ 4 (Buổi 25-32)": "Tháng thứ 4 (Buổi 25-32)",
  "Chu kỳ 5 (Buổi 33-40)": "Tháng thứ 5 (Buổi 33-40)",
  "Chu kỳ 6 (Buổi 41-48)": "Tháng thứ 6 (Buổi 41-48)",
  "Chu kỳ 7 (Buổi 49-56)": "Tháng thứ 7 (Buổi 49-56)",
  "Chu kỳ 8 (Buổi 57-64)": "Tháng thứ 8 (Buổi 57-64)",
  "Chu kỳ 9 (Buổi 65-72)":"Tháng thứ 9 (Buổi 65-72)",
  "Chu kỳ 10 (Buổi 73-80)":"Tháng thứ 10 (Buổi 73-80)",
};

async function fetchAll(path) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  return resp.json();
}

async function patch(path, body) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  return true;
}

async function main() {
  console.log("=== Buoc 1: Lay danh sach tat ca cac row can update ===");
  const allRows = await fetchAll("/rest/v1/monthly_student_evaluations?select=id,evaluation_month");
  console.log(`Tong so rows: ${allRows.length}`);

  // Hien thi cac gia tri distinct hien tai
  const distinctVals = [...new Set(allRows.map(r => r.evaluation_month))].sort();
  console.log("\nCac gia tri evaluation_month hien tai:");
  distinctVals.forEach(v => console.log(`  - "${v}"`));

  console.log("\n=== Buoc 2: Thuc hien update ===");
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [oldVal, newVal] of Object.entries(mapping)) {
    const rowsToUpdate = allRows.filter(r => r.evaluation_month === oldVal);
    if (rowsToUpdate.length === 0) {
      console.log(`  [BO QUA] "${oldVal}" - khong co row nao`);
      skippedCount++;
      continue;
    }

    console.log(`  [UPDATE] "${oldVal}" -> "${newVal}" (${rowsToUpdate.length} rows)`);

    for (const row of rowsToUpdate) {
      try {
        await patch(`/rest/v1/monthly_student_evaluations?id=eq.${row.id}`, {
          evaluation_month: newVal,
        });
        updatedCount++;
      } catch (err) {
        console.log(`    LOI update row ${row.id}: ${err.message}`);
      }
    }
  }

  console.log(`\n=== Ket qua ===`);
  console.log(`Da update thanh cong: ${updatedCount} rows`);
  console.log(`Da bo qua (khong co du lieu): ${skippedCount} mappings`);

  // Xac nhan ket qua
  console.log("\n=== Buoc 3: Xac nhan ket qua ===");
  const after = await fetchAll("/rest/v1/monthly_student_evaluations?select=evaluation_month&limit=100");
  const distinctAfter = [...new Set(after.map(r => r.evaluation_month))].sort();
  console.log("Cac gia tri evaluation_month sau khi update:");
  distinctAfter.forEach(v => console.log(`  - "${v}"`));

  console.log("\nMigration hoan tat!");
}

main().catch(err => {
  console.error("LOI:", err);
  process.exit(1);
});
