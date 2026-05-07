import fs from "fs";
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

async function extract() {
  const p = "c:\\Users\\admin\\Downloads\\AG_AI\\web\\TEST\\TEST 1\\Listening\\Answers\\Answer_keys.docx";
  const buf = fs.readFileSync(p);
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  const xml = await docXml.async("string");
  const paragraphs = paragraphsFromDocXml(xml);
  console.log(JSON.stringify(paragraphs, null, 2));
}

extract().catch(console.error);
