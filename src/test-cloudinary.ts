import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

import { uploadToCloudinary } from "./config/cloudinary";

async function runCloudinaryTest() {
  console.log("==========================================");
  console.log("☁️ TESTING CLOUDINARY UPLOAD INTEGRATION");
  console.log("==========================================");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "CONFIGURED (Ends with " + process.env.CLOUDINARY_API_KEY.slice(-4) + ")" : "MISSING");

  // Create a temporary sample file to upload
  const tempFilePath = path.join(__dirname, "../uploads/test_document.txt");
  if (!fs.existsSync(path.dirname(tempFilePath))) {
    fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
  }
  fs.writeFileSync(
    tempFilePath,
    "LOGAN INVESTMENT CO. LTD - OFFICIAL TEST DOCUMENT UPLOAD TO CLOUDINARY\nDate: " + new Date().toISOString()
  );

  console.log(`\n1. Created local temp file at: ${tempFilePath}`);
  console.log("2. Uploading file to Cloudinary cloud storage...");

  try {
    const uploadResult = await uploadToCloudinary(tempFilePath, "logan_documents");
    console.log("\n✅ CLOUDINARY UPLOAD SUCCESSFUL!");
    console.log("   Secure Cloud URL:", uploadResult.secure_url);
    console.log("   Public ID:", uploadResult.public_id);
    console.log("   Format:", uploadResult.format);
    console.log("   File Size:", uploadResult.bytes, "bytes");

    if (uploadResult.secure_url.includes("res.cloudinary.com")) {
      console.log("\n🎉 TEST PASSED: Valid Cloudinary CDN URL generated!");
    } else {
      console.error("\n❌ TEST FAILED: URL does not match Cloudinary CDN format.");
    }
  } catch (err: any) {
    console.error("\n❌ CLOUDINARY TEST ERROR:", err.message);
    process.exit(1);
  }

  console.log("==========================================");
}

runCloudinaryTest();
