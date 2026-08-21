import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { ExpenseCategory } from "@prisma/client";

export const listExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: "desc" },
    });

    const formatted = expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: e.date.toISOString(),
      description: e.description || undefined,
      addedBy: e.addedBy,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch expenses" });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, category, amount, date, description, addedBy } = req.body;

    if (!title || !category || amount === undefined) {
      res.status(400).json({ error: "Title, category, and amount are required" });
      return;
    }

    const adder = addedBy || req.user?.name || "System";

    const expense = await prisma.expense.create({
      data: {
        title,
        category: category as ExpenseCategory,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description: description || null,
        addedBy: adder,
      },
    });

    await prisma.activity.create({
      data: {
        actor: adder,
        action: "recorded an expense",
        target: expense.title,
      },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        title: "New expense recorded",
        message: `${adder} recorded an expense: ${expense.title} (${expense.amount} RWF).`,
        type: "expense",
        targetRole: "ADMIN",
      },
    });

    res.status(201).json({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date.toISOString(),
      description: expense.description || undefined,
      addedBy: expense.addedBy,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create expense" });
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, category, amount, date, description } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        category: category !== undefined ? (category as ExpenseCategory) : existing.category,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        date: date ? new Date(date) : existing.date,
        description: description !== undefined ? (description || null) : existing.description,
      },
    });

    res.json({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date.toISOString(),
      description: expense.description || undefined,
      addedBy: expense.addedBy,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update expense" });
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete expense" });
  }
};
