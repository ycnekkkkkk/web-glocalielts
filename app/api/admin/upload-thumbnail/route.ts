import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    
    if ((profile as { role: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 3. Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Generate unique filename (preserve extension)
    const originalName = file.name || "image.png";
    const extension = originalName.split('.').pop() || "png";
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(`.${extension}`, "");
    const fileName = `${safeName}_${Date.now()}.${extension}`;

    // 5. Define upload path
    const uploadDir = join(process.cwd(), "public", "thumbnails");
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }

    // 6. Save the file
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // 7. Return the relative URL
    return NextResponse.json({ url: `/thumbnails/${fileName}` });

  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
