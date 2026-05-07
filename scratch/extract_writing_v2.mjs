import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

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

async function extractAndSave(filePath, outImageDir, outImagePrefix) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  const xml = await docXml.async("string");
  const paragraphs = paragraphsFromDocXml(xml);
  
  const mediaFolder = zip.folder("word/media");
  const images = [];
  if (mediaFolder) {
    fs.mkdirSync(outImageDir, { recursive: true });
    const names = Object.keys(zip.files).filter(n => n.startsWith("word/media/") && !zip.files[n].dir);
    for (const name of names) {
      const f = zip.file(name);
      const outName = outImagePrefix + "_" + path.basename(name);
      const data = await f.async("nodebuffer");
      fs.writeFileSync(path.join(outImageDir, outName), data);
      images.push("/images/test-1/" + outName);
    }
  }
  
  return { paragraphs, images };
}

async function main() {
  const t1 = await extractAndSave("c:\\Users\\admin\\Downloads\\AG_AI\\web\\TEST\\TEST 1\\Writing\\Prompt\\Task 1.docx", "public/images/test-1", "writing_t1");
  const t2 = await extractAndSave("c:\\Users\\admin\\Downloads\\AG_AI\\web\\TEST\\TEST 1\\Writing\\Prompt\\Task 2.docx", "public/images/test-1", "writing_t2");
  console.log("TASK 1:", JSON.stringify(t1, null, 2));
  console.log("TASK 2:", JSON.stringify(t2, null, 2));
}

main().catch(console.error);
