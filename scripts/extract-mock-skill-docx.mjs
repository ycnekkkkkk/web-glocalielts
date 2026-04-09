/**
 * Trích nội dung thô từ DOCX trong web/thi_thu (Listening, Reading, Speaking, Writing).
 * DOCX là file ZIP: đọc word/document.xml + word/media/*.
 *
 * Chạy: npm run extract:mock-skill
 *
 * Đầu ra: web/data/mock-skill-generated/summary.json + ảnh (nếu có) vào
 *         web/public/mock-exams/_extracted/<tên-file>/
 *
 * Sau đó chỉnh tay JSON hoặc import vào Supabase theo schema content_public / answers.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const THI_THU = path.join(WEB_ROOT, "thi_thu");
const OUT_DIR = path.join(WEB_ROOT, "data", "mock-skill-generated");
const PUBLIC_EXTRACT = path.join(WEB_ROOT, "public", "mock-exams", "_extracted");

const FILES = ["Listening.docx", "Reading.docx", "Speaking.docx", "Writing.docx"];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function collectText(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object") {
    if (node["w:t"]) return collectText(node["w:t"]);
    return Object.values(node).map(collectText).join("");
  }
  return "";
}

function paragraphsFromDocXml(xml) {
  const doc = parser.parse(xml);
  const body = doc["w:document"]?.["w:body"];
  if (!body) return [];
  const paras = body["w:p"];
  if (!paras) return [];
  const list = Array.isArray(paras) ? paras : [paras];
  return list
    .map((p) => collectText(p).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

async function extractOne(docxPath, baseName) {
  const buf = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    return { file: baseName, error: "missing word/document.xml", paragraphs: [], images: [] };
  }
  const xml = await docXml.async("string");
  const paragraphs = paragraphsFromDocXml(xml);

  const mediaFolder = zip.folder("word/media");
  const images = [];
  if (mediaFolder) {
    const destDir = path.join(PUBLIC_EXTRACT, baseName.replace(/\.docx$/i, ""));
    fs.mkdirSync(destDir, { recursive: true });
    const names = Object.keys(zip.files).filter(
      (n) => n.startsWith("word/media/") && !zip.files[n].dir
    );
    for (const name of names) {
      const f = zip.file(name);
      if (!f) continue;
      const outName = path.basename(name);
      const data = await f.async("nodebuffer");
      fs.writeFileSync(path.join(destDir, outName), data);
      images.push(`/mock-exams/_extracted/${baseName.replace(/\.docx$/i, "")}/${outName}`);
    }
  }

  return { file: baseName, paragraphs, images };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_EXTRACT, { recursive: true });

  if (!fs.existsSync(THI_THU)) {
    fs.mkdirSync(THI_THU, { recursive: true });
    console.log(`Đã tạo ${THI_THU}. Hãy đặt ${FILES.join(", ")} vào đây rồi chạy lại.`);
    process.exit(0);
  }

  const results = [];
  for (const name of FILES) {
    const p = path.join(THI_THU, name);
    if (!fs.existsSync(p)) {
      results.push({ file: name, error: "file not found", paragraphs: [], images: [] });
      continue;
    }
    results.push(await extractOne(p, name));
  }

  const summaryPath = path.join(OUT_DIR, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), "utf8");
  console.log("Xong. Xem:", summaryPath);
  if (results.some((r) => r.images?.length)) {
    console.log("Ảnh (nếu có) tại public/mock-exams/_extracted/");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
