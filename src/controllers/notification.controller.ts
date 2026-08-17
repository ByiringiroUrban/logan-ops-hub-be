import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Role } from "@prisma/client";

export const listNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || Role.FIELD_SUPERVISOR;

    // Role-based notification scoping:
    // ADMIN sees notifications targeted to ADMIN or general notifications.
    // FIELD_SUPERVISOR sees notifications targeted to FIELD_SUPERVISOR or general notifications.
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetRole: userRole },
          { targetRole: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Filter by type relevance if targetRole was unspecified
    const scoped = notifications.filter((n) => {
      if (n.targetRole) return n.targetRole === userRole;
      if (userRole === Role.FIELD_SUPERVISOR) {
        // Field Supervisors do NOT see internal Admin documents/expense management alerts
        return n.type === "transaction" || n.type === "client" || n.type === "system";
      }
      if (userRole === Role.ADMIN) {
        // Admins see all high-level operational activity alerts
        return true;
      }
      return true;
    });

    const formatted = scoped.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
      read: n.read,
      type: n.type,
      targetRole: n.targetRole,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch notifications" });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
      read: notification.read,
      type: notification.type,
      targetRole: notification.targetRole,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update notification status" });
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || Role.FIELD_SUPERVISOR;

    await prisma.notification.updateMany({
      where: {
        read: false,
        OR: [
          { targetRole: userRole },
          { targetRole: null },
        ],
      },
      data: { read: true },
    });

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark notifications as read" });
  }
};
