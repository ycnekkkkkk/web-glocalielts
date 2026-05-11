import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename while preserving extension
    const originalName = file.name;
    const extension = path.extname(originalName);
    const fileName = `${crypto.randomUUID()}${extension}`;

    // Check if it's an image
    const isImage = file.type.startsWith("image/");
    const folder = isImage ? "images" : "audio";

    // Define upload path: public/images or public/audio
    const uploadDir = path.join(process.cwd(), "public", folder);
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }

    const filePath = path.join(uploadDir, fileName);
    
    // Save the file
    await writeFile(filePath, buffer);

    // Return the public URL
    return NextResponse.json({ url: `/${folder}/${fileName}` });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file: " + error.message },
      { status: 500 }
    );
  }
}
