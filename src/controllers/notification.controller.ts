import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Role } from "@prisma/client";

export const listNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || Role.FIELD_SUPERVISOR;
    const userName = req.user?.name;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetRole: userRole },
          { targetRole: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Filter notifications for strict role and user isolation
    const scoped = notifications.filter((n) => {
      if (userRole === Role.ADMIN) {
        return true;
      }
      if (userRole === Role.FIELD_SUPERVISOR) {
        if (n.targetRole === Role.FIELD_SUPERVISOR) return true;
        if (userName && n.message) {
          return n.message.toLowerCase().includes(userName.toLowerCase());
        }
        return false;
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

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.notification.delete({
      where: { id },
    });

    res.json({ success: true, message: "Notification deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete notification" });
  }
};

export const deleteAllNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || Role.FIELD_SUPERVISOR;

    if (userRole === Role.ADMIN) {
      await prisma.notification.deleteMany({});
    } else {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { targetRole: Role.FIELD_SUPERVISOR },
            { targetRole: null },
          ],
        },
      });
    }

    res.json({ success: true, message: "All notifications deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete notifications" });
  }
};

