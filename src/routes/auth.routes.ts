import { Router } from "express";
import {
  login,
  logout,
  getMe,
  updateProfile,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", requestPasswordResetOTP);
router.post("/reset-password", resetPasswordWithOTP);
router.get("/me", authenticateToken, getMe);
router.patch("/profile", authenticateToken, updateProfile);

export default router;
