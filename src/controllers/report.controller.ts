import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const getReportSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : new Date("2000-01-01");
    const end = endDate ? new Date(`${endDate}T23:59:59Z`) : new Date("2100-01-01");

    const validTrx = await prisma.transaction.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    });

    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";
    const totalClientsCount = await prisma.client.count();

    const uniqueClientsInTrx = new Set(validTrx.map((t) => t.clientId)).size;
    const totalRevenue = validTrx.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = isSupervisor ? 0 : expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalQuantity = validTrx.reduce((sum, t) => sum + t.quantity, 0);

    res.json({
      totalClients: uniqueClientsInTrx || totalClientsCount,
      totalTransactions: validTrx.length,
      totalQuantity,
      totalRevenue,
      ...(isSupervisor ? {} : { totalExpenses, netRevenue: totalRevenue - totalExpenses }),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate report summary" });
  }
};

export const getDashboardAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const range = (req.query.range as string) || "week";

    const now = new Date();
    // Strict bounds for TODAY (00:00:00.000 to 23:59:59.999 local/server time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Strict bounds for YESTERDAY (for accurate dynamic trend calculation)
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    // Fetch TODAY's active records (resets to 0 at 00:00 of each new day)
    const todaysTrx = await prisma.transaction.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
        status: { not: "CANCELLED" },
      },
    });

    const todaysExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
      },
    });

    // Fetch YESTERDAY's records for trend calculation
    const yesterdaysTrx = await prisma.transaction.findMany({
      where: {
        date: { gte: startOfYesterday, lte: endOfYesterday },
        status: { not: "CANCELLED" },
      },
    });

    const yesterdaysExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: startOfYesterday, lte: endOfYesterday },
      },
    });

    const totalClients = await prisma.client.count();
    const todaysRevenue = todaysTrx.reduce((s, t) => s + t.totalAmount, 0);
    const todaysExpensesSum = todaysExpenses.reduce((s, e) => s + e.amount, 0);
    const todaysQuantity = todaysTrx.reduce((s, t) => s + t.quantity, 0);

    const yesterdaysRevenue = yesterdaysTrx.reduce((s, t) => s + t.totalAmount, 0);
    const yesterdaysExpensesSum = yesterdaysExpenses.reduce((s, e) => s + e.amount, 0);

    // Dynamic trend calculations vs yesterday
    const calcTrend = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const trxTrend = calcTrend(todaysTrx.length, yesterdaysTrx.length);
    const revTrend = calcTrend(todaysRevenue, yesterdaysRevenue);
    const expTrend = calcTrend(todaysExpensesSum, yesterdaysExpensesSum);

    // Range bounds for interactive charts (Revenue Overview & Product Performance)
    let rangeStart: Date;
    let rangeEnd: Date = endOfToday;

    if (range === "today") {
      rangeStart = startOfToday;
    } else if (range === "week") {
      const weekStart = new Date(now);
      const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      rangeStart = weekStart;
    } else if (range === "month") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const rangeTrx = await prisma.transaction.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        status: { not: "CANCELLED" },
      },
      include: { product: true },
      orderBy: { date: "asc" },
    });

    const rangeExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
      },
    });

    // Revenue series bucketing for charts
    const seriesMap = new Map<string, number>();
    if (range === "today") {
      rangeTrx.forEach((t) => {
        const label = `${t.date.toISOString().slice(11, 13)}:00`;
        seriesMap.set(label, (seriesMap.get(label) || 0) + t.totalAmount);
      });
    } else if (range === "year") {
      rangeTrx.forEach((t) => {
        const label = t.date.toLocaleDateString("en-GB", { month: "short" });
        seriesMap.set(label, (seriesMap.get(label) || 0) + t.totalAmount);
      });
    } else {
      rangeTrx.forEach((t) => {
        const label = t.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        seriesMap.set(label, (seriesMap.get(label) || 0) + t.totalAmount);
      });
    }

    const revenueSeries = Array.from(seriesMap.entries()).map(([label, revenue]) => ({
      label,
      revenue,
    }));

    // Product summary
    const allProducts = await prisma.product.findMany();
    const totalRangeRevenue = rangeTrx.reduce((s, t) => s + t.totalAmount, 0) || 1;

    const productSummary = allProducts.map((p) => {
      const pTrx = rangeTrx.filter((t) => t.productId === p.id);
      const rev = pTrx.reduce((s, t) => s + t.totalAmount, 0);
      const qty = pTrx.reduce((s, t) => s + t.quantity, 0);
      return {
        productName: p.name,
        quantity: qty,
        revenue: rev,
        percentage: Math.round((rev / totalRangeRevenue) * 1000) / 10,
      };
    });

    const isSupervisor = req.user?.role === "FIELD_SUPERVISOR";

    // Expense summary by category (for Admin)
    const expMap = new Map<string, number>();
    if (!isSupervisor) {
      rangeExpenses.forEach((e) => {
        expMap.set(e.category, (expMap.get(e.category) || 0) + e.amount);
      });
    }

    const expenseSummary = Array.from(expMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    res.json({
      stats: {
        totalClients,
        todaysTransactionCount: todaysTrx.length,
        todaysRevenue: todaysRevenue,
        todaysExpenses: isSupervisor ? 0 : todaysExpensesSum,
        todaysQuantity: todaysQuantity,
        trxTrend,
        revTrend,
        expTrend,
      },
      revenueSeries,
      productSummary,
      expenseSummary: isSupervisor ? [] : expenseSummary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch dashboard analytics" });
  }
};

export const exportPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ url: null, message: "PDF export payload generated" });
};

export const exportExcel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ url: null, message: "Excel export payload generated" });
};
