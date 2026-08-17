import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const listActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const where: any = {};
    if (isSupervisor) {
      where.actor = userName || "NO_MATCH_FOR_FIELD_SUPERVISOR";
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const formatted = activities.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      target: a.target,
      createdAt: a.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch activities" });
  }
};

export const deleteActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.activity.delete({
      where: { id },
    });

    res.json({ success: true, message: "Activity deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete activity" });
  }
};

export const clearAllActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const where: any = {};
    if (isSupervisor && userName) {
      where.actor = userName;
    }

    await prisma.activity.deleteMany({
      where,
    });

    res.json({ success: true, message: "All activities cleared" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to clear activities" });
  }
};

