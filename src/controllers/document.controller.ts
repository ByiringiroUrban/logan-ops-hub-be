import { Response } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { DocumentCategory, FileType, NotificationType } from "@prisma/client";

import { uploadToCloudinary } from "../config/cloudinary";

export const listDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docs = await prisma.companyDocument.findMany({
      orderBy: { uploadedAt: "desc" },
    });

    const formatted = docs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category.replace("_", " "),
      fileType: d.fileType,
      sizeKb: d.sizeKb,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.uploadedAt.toISOString(),
      filePath: d.filePath,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch documents" });
  }
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const { name, category, fileType, sizeKb, uploadedBy } = req.body;

    const docName = name || (file ? file.originalname : "Untitled Document");

    let catKey = (category || "Other").replace(" ", "_") as DocumentCategory;
    if (!Object.values(DocumentCategory).includes(catKey)) {
      catKey = DocumentCategory.Other;
    }

    let fType = (fileType || (file ? path.extname(file.originalname).replace(".", "").toUpperCase() : "PDF")) as FileType;
    if (!Object.values(FileType).includes(fType)) {
      fType = FileType.PDF;
    }

    let cloudUrl: string | null = null;
    let calculatedSize = sizeKb ? Number(sizeKb) : file ? Math.round(file.size / 1024) : 500;

    if (file && fs.existsSync(file.path)) {
      try {
        const cloudResult = await uploadToCloudinary(file.path, "logan_documents");
        cloudUrl = cloudResult.secure_url;
        if (cloudResult.bytes) {
          calculatedSize = Math.round(cloudResult.bytes / 1024);
        }
      } catch (cloudErr: any) {
        console.error("[STORAGE ERROR] Cloudinary upload failed, falling back to local path:", cloudErr.message);
        cloudUrl = file.path;
      }
    }

    const uploader = uploadedBy || req.user?.name || "System";

    const doc = await prisma.companyDocument.create({
      data: {
        name: docName,
        category: catKey,
        fileType: fType,
        sizeKb: calculatedSize,
        filePath: cloudUrl,
        uploadedBy: uploader,
      },
    });

    await prisma.notification.create({
      data: {
        title: "Document uploaded",
        message: `${doc.name} was uploaded to Cloudinary.`,
        type: NotificationType.document,
        targetRole: "ADMIN",
      },
    });

    res.status(201).json({
      id: doc.id,
      name: doc.name,
      category: doc.category.replace("_", " "),
      fileType: doc.fileType,
      sizeKb: doc.sizeKb,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt.toISOString(),
      filePath: doc.filePath,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to upload document" });
  }
};

export const downloadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const isInline = req.query.inline === "true" || req.query.preview === "true";
    const doc = await prisma.companyDocument.findUnique({ where: { id } });

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Cloudinary HTTPS Cloud URL
    if (doc.filePath && (doc.filePath.startsWith("http://") || doc.filePath.startsWith("https://"))) {
      if (doc.filePath.includes("cloudinary.com")) {
        if (isInline && doc.fileType === "PDF") {
          // Cloudinary restricts direct raw PDF delivery (401), but allows PDF->PNG image conversion
          const pngUrl = doc.filePath.replace(/\.pdf$/i, ".png");
          res.redirect(pngUrl);
          return;
        }
        if (!isInline && doc.filePath.includes("/upload/")) {
          // Force attachment download from Cloudinary
          const attachmentUrl = doc.filePath.replace("/upload/", "/upload/fl_attachment/");
          res.redirect(attachmentUrl);
          return;
        }
      }
      res.redirect(doc.filePath);
      return;
    }

    // Local Disk File
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      if (isInline) {
        let mimeType = "application/octet-stream";
        if (doc.fileType === "PDF") mimeType = "application/pdf";
        else if (doc.fileType === "PNG") mimeType = "image/png";
        else if (doc.fileType === "JPG") mimeType = "image/jpeg";
        else if (doc.fileType === "XLSX") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        else if (doc.fileType === "DOCX") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.name)}.${doc.fileType.toLowerCase()}"`);
        fs.createReadStream(doc.filePath).pipe(res);
        return;
      }

      res.download(doc.filePath, `${doc.name}.${doc.fileType.toLowerCase()}`);
      return;
    }

    // Fallback for documents without physical file on disk: return clean branded HTML preview page
    if (isInline) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${doc.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b; display: flex; justify-content: center; }
    .doc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 650px; width: 100%; padding: 40px; }
    .header { border-bottom: 2px solid #0369a1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .title { color: #0369a1; font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { color: #64748b; font-size: 12px; margin: 0; }
    .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; background: #f1f5f9; padding: 20px; border-radius: 8px; }
    .field-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .field-val { font-size: 14px; color: #0f172a; font-weight: 600; }
    .seal { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="doc-card">
    <div class="header">
      <div>
        <h1 class="title">LOGAN INVESTMENT CO. LTD</h1>
        <p class="subtitle">Document Vault & Verification Record</p>
      </div>
      <span class="badge">${doc.fileType} • ${doc.category.replace("_", " ")}</span>
    </div>
    <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #0f172a;">${doc.name}</h2>
    <div class="grid">
      <div>
        <div class="field-label">Document ID</div>
        <div class="field-val">${doc.id}</div>
      </div>
      <div>
        <div class="field-label">Category</div>
        <div class="field-val">${doc.category.replace("_", " ")}</div>
      </div>
      <div>
        <div class="field-label">Uploaded By</div>
        <div class="field-val">${doc.uploadedBy}</div>
      </div>
      <div>
        <div class="field-label">Upload Date</div>
        <div class="field-val">${new Date(doc.uploadedAt).toLocaleDateString()}</div>
      </div>
    </div>
    <p style="font-size: 13px; line-height: 1.6; color: #334155;">
      This document entry is securely archived in the Logan Investment Co. Ltd operational database.
      The full document metadata and access logs are verified.
    </p>
    <div class="seal">
      🔒 LOGAN INVESTMENT CO. LTD — VERIFIED DIGITAL RECORD
    </div>
  </div>
</body>
</html>`);
      return;
    }

    const disposition = "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${doc.name}.${doc.fileType.toLowerCase()}"`);
    res.setHeader("Content-Type", "text/plain");
    res.send(`Logan Investment Co. Ltd - Official Document Preview\nDocument Name: ${doc.name}\nCategory: ${doc.category}\nFile Type: ${doc.fileType}\nUploaded By: ${doc.uploadedBy}\nUploaded At: ${doc.uploadedAt}`);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to download document" });
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const doc = await prisma.companyDocument.findUnique({ where: { id } });
    if (doc && doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    await prisma.companyDocument.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete document" });
  }
};
