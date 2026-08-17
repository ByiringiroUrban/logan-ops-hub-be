import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary with user credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dyp92boyd",
  api_key: process.env.CLOUDINARY_API_KEY || "746946526939831",
  api_secret: process.env.CLOUDINARY_API_SECRET || "2Ohd6yF1ZSLg0jQTU_S9CSiNC8Q",
  secure: true,
});

export { cloudinary };

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

/**
 * Upload local file to Cloudinary with automatic format detection
 */
export async function uploadToCloudinary(
  filePath: string,
  folder: string = "logan_documents"
): Promise<CloudinaryUploadResult> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto", // Automatically detects PDF, DOCX, XLSX, images, etc.
      use_filename: true,
      unique_filename: true,
    });

    // Clean up local temp file after successful cloud upload
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn(`[STORAGE WARNING] Could not remove temp file: ${filePath}`);
      }
    }

    console.log(`[CLOUDINARY LOG] ☁️ File uploaded to Cloudinary: ${result.secure_url}`);
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error: any) {
    console.error("[CLOUDINARY LOG] ❌ Cloudinary Upload Failed:", error);
    throw new Error(error.message || "Cloudinary Upload Failed");
  }
}
