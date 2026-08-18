import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import {
  login,
  logout,
  getMe,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";

const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "../../uploads");

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("[UPLOAD DIR WARN] Could not create upload directory for avatars:", err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (PNG, JPG, JPEG, WEBP, GIF) are allowed"));
    }
  },
});

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", requestPasswordResetOTP);
router.post("/reset-password", resetPasswordWithOTP);
router.get("/me", authenticateToken, getMe);
router.patch("/profile", authenticateToken, updateProfile);
router.post("/avatar", authenticateToken, upload.single("avatar"), uploadAvatar);
router.delete("/avatar", authenticateToken, removeAvatar);

export default router;
