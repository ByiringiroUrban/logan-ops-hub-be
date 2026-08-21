import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { sendOtpEmail } from "../config/mailer";
import { uploadToCloudinary } from "../config/cloudinary";

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, identifier: reqIdentifier, password } = req.body;
    const identifier = String(reqIdentifier || email || phone || "").trim();

    console.log(`\n--------------------------------------------------`);
    console.log(`[AUTH LOG] 🔑 Login request received at ${new Date().toISOString()}`);
    console.log(`[AUTH LOG] 🆔 Identifier: "${identifier}"`);

    if (!identifier || !password) {
      console.log(`[AUTH LOG] ❌ Login failed: Missing email/phone or password`);
      res.status(400).json({ error: "Email or phone number and password are required" });
      return;
    }

    const cleanDigits = identifier.replace(/\D/g, "");
    const phoneVariations: string[] = [identifier];
    if (cleanDigits.length >= 8) {
      const localNum = cleanDigits.slice(-9);
      phoneVariations.push(
        `0${localNum}`,
        `+250${localNum}`,
        `+250 ${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
        `0${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneVariations } },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-8) } }] : []),
        ],
      },
    });

    if (!user) {
      console.log(`[AUTH LOG] ❌ Login failed: User with identifier "${identifier}" not found in PostgreSQL`);
      res.status(401).json({ error: "Invalid email/phone or password" });
      return;
    }

    if (user.status === "INACTIVE") {
      console.log(`[AUTH LOG] ⚠️ Login failed: User "${identifier}" account is INACTIVE`);
      res.status(403).json({ error: "This account is deactivated. Contact an administrator." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      console.log(`[AUTH LOG] ❌ Login failed: Incorrect password for "${identifier}"`);
      res.status(401).json({ error: "Invalid email/phone or password" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true,
      },
    });

    const secret = process.env.JWT_SECRET || "fallback_secret";
    const token = jwt.sign({ id: user.id, role: user.role }, secret, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[AUTH LOG] ✅ Login SUCCESS! User: "${updatedUser.name}" (${updatedUser.role})`);
    console.log(`--------------------------------------------------\n`);

    res.json({
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
      },
      token,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Login Server Error:`, error);
    res.status(500).json({ error: error.message || "Failed to log in" });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  console.log(`[AUTH LOG] 🚪 Logout request for user ID: ${req.user?.id || "unknown"}`);
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      console.log(`[AUTH LOG] ⚠️ /auth/me requested without user session`);
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      console.log(`[AUTH LOG] ⚠️ /auth/me user ID ${req.user.id} not found`);
      res.status(404).json({ error: "User not found" });
      return;
    }

    console.log(`[AUTH LOG] 👤 Session verified for: "${user.email}" (${user.role})`);
    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 /auth/me error:`, error);
    res.status(500).json({ error: error.message || "Failed to fetch user profile" });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { name, phone, password, avatarUrl } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true,
      },
    });

    console.log(`[AUTH LOG] ✏️ Profile updated for user: "${updatedUser.email}"`);

    res.json({
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Profile update error:`, error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    let cloudUrl: string | null = null;
    if (file && fs.existsSync(file.path)) {
      try {
        console.log(`[AUTH LOG] 📸 Uploading user avatar to Cloudinary for ${req.user.id}...`);
        const cloudResult = await uploadToCloudinary(file.path, "logan_avatars");
        cloudUrl = cloudResult.secure_url;
      } catch (cloudErr: any) {
        console.error("[STORAGE ERROR] Cloudinary avatar upload failed:", cloudErr.message);
        res.status(500).json({ error: cloudErr.message || "Cloudinary upload failed" });
        return;
      }
    }

    if (!cloudUrl) {
      res.status(500).json({ error: "Failed to generate cloud storage URL for avatar" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: cloudUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true,
      },
    });

    try {
      await prisma.activity.create({
        data: {
          actor: updatedUser.name,
          action: "UPDATED_AVATAR",
          target: "Profile Photo",
        },
        select: { id: true },
      });
    } catch {
      /* ignore activity logging error */
    }

    console.log(`[AUTH LOG] ✅ Avatar updated on Cloudinary: ${cloudUrl}`);

    res.json({
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
      },
      avatarUrl: cloudUrl,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Avatar upload error:`, error);
    res.status(500).json({ error: error.message || "Failed to upload avatar" });
  }
};

export const removeAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true,
      },
    });

    console.log(`[AUTH LOG] 🗑️ Avatar removed for user: "${updatedUser.email}"`);

    res.json({
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Remove avatar error:`, error);
    res.status(500).json({ error: error.message || "Failed to remove avatar" });
  }
};

export const requestPasswordResetOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { identifier: reqIdentifier, email, phone } = req.body;
    const identifier = String(reqIdentifier || email || phone || "").trim();

    if (!identifier) {
      res.status(400).json({ error: "Email or phone number is required" });
      return;
    }

    const cleanDigits = identifier.replace(/\D/g, "");
    const phoneVariations: string[] = [identifier];
    if (cleanDigits.length >= 8) {
      const localNum = cleanDigits.slice(-9);
      phoneVariations.push(
        `0${localNum}`,
        `+250${localNum}`,
        `+250 ${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
        `0${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneVariations } },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-8) } }] : []),
        ],
      },
    });

    if (!user) {
      res.status(404).json({ error: "No account found matching this email or phone number" });
      return;
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete existing OTPs for user
    await prisma.passwordReset.deleteMany({
      where: { email: user.email },
    });

    // Save new OTP
    await prisma.passwordReset.create({
      data: {
        email: user.email,
        otp,
        expiresAt,
      },
    });

    // Send Email
    const emailSent = await sendOtpEmail(user.email, otp, user.name);

    if (!emailSent) {
      res.status(500).json({ error: "Failed to send OTP email. Please check server SMTP configuration." });
      return;
    }

    console.log(`[AUTH LOG] 🔑 OTP (${otp}) successfully sent to ${user.email}`);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}`,
      email: user.email,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Request OTP error:`, error);
    res.status(500).json({ error: error.message || "Failed to request password reset OTP" });
  }
};

export const resetPasswordWithOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { identifier: reqIdentifier, email, phone, otp, newPassword } = req.body;
    const identifier = String(reqIdentifier || email || phone || "").trim();

    if (!identifier || !otp || !newPassword) {
      res.status(400).json({ error: "Email/phone, OTP code, and new password are required" });
      return;
    }

    if (String(newPassword).length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    const cleanDigits = identifier.replace(/\D/g, "");
    const phoneVariations: string[] = [identifier];
    if (cleanDigits.length >= 8) {
      const localNum = cleanDigits.slice(-9);
      phoneVariations.push(
        `0${localNum}`,
        `+250${localNum}`,
        `+250 ${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
        `0${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneVariations } },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-8) } }] : []),
        ],
      },
    });

    if (!user) {
      res.status(404).json({ error: "User account not found" });
      return;
    }

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email: user.email,
        otp: String(otp).trim(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetRecord) {
      res.status(400).json({ error: "Invalid or expired verification OTP code" });
      return;
    }

    // Hash new password & update user
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete used password resets
    await prisma.passwordReset.deleteMany({
      where: { email: user.email },
    });

    console.log(`[AUTH LOG] 🎉 Password reset successful for user "${user.email}"`);

    res.json({
      success: true,
      message: "Password updated successfully! You can now log in with your new password.",
      email: user.email,
    });
  } catch (error: any) {
    console.error(`[AUTH LOG] 💥 Reset password error:`, error);
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
};

