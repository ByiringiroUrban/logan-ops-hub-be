import { Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Role, UserStatus } from "@prisma/client";

export const listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
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
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch user" });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, status, password } = req.body;

    if (!name || !email || !phone) {
      res.status(400).json({ error: "Name, email, and phone are required" });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password || "password123", 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        phone,
        role: role === "ADMIN" ? Role.ADMIN : Role.FIELD_SUPERVISOR,
        status: status === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
      },
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

    res.status(201).json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create user" });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, phone, role, status, password, avatarUrl } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role === "ADMIN" ? Role.ADMIN : Role.FIELD_SUPERVISOR;
    if (status) updateData.status = status === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
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

    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update user" });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
};
