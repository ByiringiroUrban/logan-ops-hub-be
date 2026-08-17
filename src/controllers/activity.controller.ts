import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const listActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
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
