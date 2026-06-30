// src/lib/civic/imageStorage.ts
// Shared server-side utility to save base64 and remote images as physical files

import fs from "fs";
import path from "path";

/**
 * Saves a base64 data URL or a remote image URL to the local public uploads directory.
 * Returns the relative public path (e.g. /uploads/evidence-123456.jpg).
 */
export async function saveImageLocally(inputUrl: string): Promise<string> {
  if (!inputUrl) return "";

  // If already saved as a relative upload path, return it directly
  if (inputUrl.startsWith("/uploads/")) {
    return inputUrl;
  }

  const publicDir = path.join(process.cwd(), "public");
  const uploadsDir = path.join(publicDir, "uploads");

  try {
    // Ensure the public/uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `evidence-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    if (inputUrl.startsWith("data:image/")) {
      const parts = inputUrl.split(",");
      if (parts.length < 2) return inputUrl;

      const meta = parts[0];
      const base64Data = parts[1];
      const mime = meta.split(";")[0].split(":")[1] || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const finalFilename = `${filename}.${ext}`;
      const filePath = path.join(uploadsDir, finalFilename);

      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      return `/uploads/${finalFilename}`;
    }

    if (inputUrl.startsWith("http")) {
      const res = await fetch(inputUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = res.headers.get("content-type") || "image/jpeg";
        const ext = mime.split("/")[1] || "jpg";
        const finalFilename = `${filename}.${ext}`;
        const filePath = path.join(uploadsDir, finalFilename);

        fs.writeFileSync(filePath, buffer);
        return `/uploads/${finalFilename}`;
      }
    }
  } catch (err) {
    console.error("Failed to save image file locally:", err);
  }

  return inputUrl;
}
