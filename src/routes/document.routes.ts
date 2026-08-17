import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from "../controllers/document.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = Router();

router.use(authenticateToken, requireRole(Role.ADMIN));

router.get("/", listDocuments);
router.get("/:id/download", downloadDocument);
router.post("/", upload.single("file"), uploadDocument);
router.delete("/:id", deleteDocument);

export default router;
