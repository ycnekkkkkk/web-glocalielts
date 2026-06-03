import fs from "fs";
import JSZip from "jszip";

async function main() {
  const filePath = "c:\\Users\\admin\\Downloads\\AG_AI\\RIG1 - BCHL tháng thứ nhất - An Qúy .docx";
  if (!fs.existsSync(filePath)) {
    console.error("File not found at:", filePath);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    console.error("Missing word/document.xml");
    return;
  }
  const xml = await docXml.async("string");

  // Let's find tbl matches
  const tblRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
  let tblMatch;
  while ((tblMatch = tblRegex.exec(xml)) !== null) {
    const tblXml = tblMatch[0];
    if (tblXml.includes("Course classes") || tblXml.includes("Attendance")) {
      console.log(`\n=== TABLE 2 XML ===`);
      const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
      let trMatch;
      let trIdx = 1;
      while ((trMatch = trRegex.exec(tblXml)) !== null) {
        const trXml = trMatch[0];
        if (trXml.includes("GVVN")) {
          console.log(`Row ${trIdx} (GVVN Row XML):`);
          console.log(trXml);
        }
        trIdx++;
      }
    }
  }
}

main().catch(console.error);
