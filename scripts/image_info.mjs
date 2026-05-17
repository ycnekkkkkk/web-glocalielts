import fs from "fs";
import path from "path";

// A simple PNG parser to read dimensions from IHDR chunk
function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature is 8 bytes
  // IHDR chunk starts at byte 12, length 4, "IHDR" 4, width 4, height 4
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const dir = "public/thumbnails";
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith(".png")) {
    const { width, height } = getPngDimensions(path.join(dir, file));
    console.log(`${file}: ${width}x${height} (ratio: ${(width / height).toFixed(2)})`);
  }
});
