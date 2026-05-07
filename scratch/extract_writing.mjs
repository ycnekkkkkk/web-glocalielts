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

async function extract(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  const xml = await docXml.async("string");
  const paragraphs = paragraphsFromDocXml(xml);
  
  // Also check for images
  const mediaFolder = zip.folder("word/media");
  const imageNames = mediaFolder ? Object.keys(zip.files).filter(n => n.startsWith("word/media/")) : [];
  
  return { paragraphs, imageCount: imageNames.length, imageNames };
}

async function main() {
  const t1 = await extract("c:\\Users\\admin\\Downloads\\AG_AI\\web\\TEST\\TEST 1\\Writing\\Prompt\\Task 1.docx");
  const t2 = await extract("c:\\Users\\admin\\Downloads\\AG_AI\\web\\TEST\\TEST 1\\Writing\\Prompt\\Task 2.docx");
  console.log("TASK 1:", JSON.stringify(t1, null, 2));
  console.log("TASK 2:", JSON.stringify(t2, null, 2));
}

main().catch(console.error);
