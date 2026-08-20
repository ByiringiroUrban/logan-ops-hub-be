import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

/** Helper to parse start & end of a YYYY-MM-DD or today date */
function getDateBounds(dateStr?: string): { start: Date; end: Date } {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    return { start, end };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export const listActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const {
      today,
      period,
      date,
      startDate,
      endDate,
      search,
      category,
      limit,
    } = req.query;

    const where: any = {};

    // Role-based visibility
    if (isSupervisor) {
      where.actor = userName || "NO_MATCH_FOR_FIELD_SUPERVISOR";
      where.action = { contains: "transaction", mode: "insensitive" };
    }

    // 1. Specific Date Filter (e.g. date=2026-08-20)
    if (date && typeof date === "string") {
      const { start, end } = getDateBounds(date);
      where.createdAt = { gte: start, lte: end };
    }
    // 2. Today filter (today=true or period=today)
    else if (today === "true" || period === "today") {
      const { start, end } = getDateBounds();
      where.createdAt = { gte: start, lte: end };
    }
    // 3. Date Range (startDate & endDate)
    else if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate && typeof startDate === "string") {
        const { start } = getDateBounds(startDate);
        dateFilter.gte = start;
      }
      if (endDate && typeof endDate === "string") {
        const { end } = getDateBounds(endDate);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    }

    // 4. Search Filter (actor, action, target)
    if (search && typeof search === "string" && search.trim() !== "") {
      const term = search.trim();
      const searchConditions = [
        { actor: { contains: term, mode: "insensitive" } },
        { action: { contains: term, mode: "insensitive" } },
        { target: { contains: term, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // 5. Category Filter (for Admin only, supervisor is always transactions)
    if (!isSupervisor && category && typeof category === "string" && category !== "ALL") {
      const cat = category.toLowerCase();
      where.action = { contains: cat, mode: "insensitive" };
    }

    const take = limit ? Math.min(Math.max(Number(limit), 1), 500) : 100;

    const activities = await prisma.activity.findMany({
      where,
      select: {
        id: true,
        actor: true,
        action: true,
        target: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const formatted = activities.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      target: a.target,
      date: a.createdAt.toISOString().split("T")[0],
      createdAt: a.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch activities" });
  }
};

/**
 * Returns distinct dates that have activities with activity count and actors summary
 * Allows easy browsing / grouping in the Activity History section
 */
export const getActivityHistoryDates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const where: any = {};
    if (isSupervisor) {
      where.actor = userName || "NO_MATCH_FOR_FIELD_SUPERVISOR";
      where.action = { contains: "transaction", mode: "insensitive" };
    }

    const allActivities = await prisma.activity.findMany({
      where,
      select: {
        id: true,
        actor: true,
        action: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const dateMap = new Map<
      string,
      { count: number; actors: Set<string>; actions: Set<string>; latestCreatedAt: Date }
    >();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Always ensure today's entry exists in the summary map
    dateMap.set(todayStr, {
      count: 0,
      actors: new Set<string>(),
      actions: new Set<string>(),
      latestCreatedAt: now,
    });

    for (const a of allActivities) {
      const dt = new Date(a.createdAt);
      const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      
      const entry = dateMap.get(dStr) || {
        count: 0,
        actors: new Set<string>(),
        actions: new Set<string>(),
        latestCreatedAt: dt,
      };

      entry.count += 1;
      if (a.actor) entry.actors.add(a.actor);
      if (a.action) entry.actions.add(a.action);
      if (dt > entry.latestCreatedAt) entry.latestCreatedAt = dt;
      dateMap.set(dStr, entry);
    }

    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, val]) => {
        const [y, m, d] = dateKey.split("-").map(Number);
        const objDate = new Date(y, m - 1, d);
        const formattedDate = objDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return {
          date: dateKey,
          formattedDate,
          isToday: dateKey === todayStr,
          count: val.count,
          actors: Array.from(val.actors),
        };
      });

    res.json(sortedDates);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch activity history dates" });
  }
};

/**
 * Returns today's active activity stats (starting clean at 0 on each new day)
 */
export const getTodayActivityStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const { start, end } = getDateBounds();
    const where: any = {
      createdAt: { gte: start, lte: end },
    };

    if (isSupervisor) {
      where.actor = userName || "NO_MATCH_FOR_FIELD_SUPERVISOR";
    }

    const todaysActivities = await prisma.activity.findMany({
      where,
      select: {
        id: true,
        actor: true,
        action: true,
        target: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let transactionsCount = 0;
    let clientsCount = 0;
    let expensesCount = 0;
    let productsCount = 0;
    let otherCount = 0;

    for (const a of todaysActivities) {
      const act = a.action.toLowerCase();
      if (act.includes("transaction") || act.includes("sales")) {
        transactionsCount++;
      } else if (act.includes("client") || act.includes("customer")) {
        clientsCount++;
      } else if (act.includes("expense") || act.includes("payment")) {
        expensesCount++;
      } else if (act.includes("product")) {
        productsCount++;
      } else {
        otherCount++;
      }
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    res.json({
      date: todayStr,
      formattedDate: now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      totalCount: todaysActivities.length,
      transactionsCount,
      clientsCount,
      expensesCount,
      productsCount,
      otherCount,
      recent: todaysActivities.slice(0, 10).map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        target: a.target,
        date: a.createdAt.toISOString().split("T")[0],
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch today activity stats" });
  }
};

export const deleteActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;

    const where: any = { id };
    if (isSupervisor && userName) {
      where.actor = userName;
    }

    const result = await prisma.activity.deleteMany({
      where,
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Activity not found or unauthorized to delete" });
      return;
    }

    res.json({ success: true, message: "Activity deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete activity" });
  }
};

export const deleteActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const userName = req.user?.name;
    const { date, ids } = req.body || {};
    const queryDate = req.query.date as string | undefined;

    const targetDate = date || queryDate;

    const where: any = {};
    if (isSupervisor && userName) {
      where.actor = userName;
    }

    // 1. Batch IDs deletion
    if (Array.isArray(ids) && ids.length > 0) {
      where.id = { in: ids };
    }
    // 2. Specific Date deletion
    else if (targetDate && typeof targetDate === "string") {
      const { start, end } = getDateBounds(targetDate);
      where.createdAt = { gte: start, lte: end };
    }

    const deleted = await prisma.activity.deleteMany({
      where,
    });

    res.json({
      success: true,
      count: deleted.count,
      message: targetDate
        ? `Activities for ${targetDate} deleted (${deleted.count} items)`
        : `${deleted.count} activities deleted successfully`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete activities" });
  }
};

