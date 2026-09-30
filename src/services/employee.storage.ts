import { prisma } from "../config/prisma";
import { Employee, AdvanceLedgerEntry } from "@prisma/client";

export const employeeStorage = {
  getAll: async () => {
    return prisma.employee.findMany({
      include: {
        advanceHistory: true,
      },
    });
  },

  getById: async (id: string) => {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        advanceHistory: true,
      },
    });
  },

  create: async (data: Omit<Employee, "id" | "createdAt" | "totalAdvance" | "totalAdvanceDeducted" | "advanceBalance" | "totalDeliveriesValue">) => {
    return prisma.employee.create({
      data: {
        ...data,
      },
    });
  },

  update: async (id: string, updates: Partial<Employee>) => {
    return prisma.employee.update({
      where: { id },
      data: updates,
    });
  },

  delete: async (id: string) => {
    try {
      await prisma.employee.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  },

  recordAdvance: async (
    id: string,
    data: {
      amount: number;
      notes?: string;
      date?: string;
      paymentMethod?: string;
      recordedBy: string;
    }
  ) => {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return null;

    const amount = data.amount;
    const newTotalAdvance = employee.totalAdvance + amount;
    const newAdvanceBalance = employee.advanceBalance + amount;

    const newLedger = await prisma.advanceLedgerEntry.create({
      data: {
        employeeId: id,
        type: "ADVANCE_GIVEN",
        amount,
        balanceAfter: newAdvanceBalance,
        notes: data.notes,
        date: data.date || new Date().toISOString(),
        paymentMethod: data.paymentMethod,
        recordedBy: data.recordedBy,
      },
    });

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        totalAdvance: newTotalAdvance,
        advanceBalance: newAdvanceBalance,
      },
    });

    return {
      ledger: newLedger,
      employee: updatedEmployee,
    };
  },

  recordDeduction: async (
    id: string,
    data: {
      deductionAmount: number;
      deliveryValue: number;
      materialDescription?: string;
      saleId?: string;
      saleNumber?: string;
      notes?: string;
      recordedBy: string;
      date?: string;
    }
  ) => {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return null;

    const newDeliveriesValue = employee.totalDeliveriesValue + data.deliveryValue;
    const newAdvanceDeducted = employee.totalAdvanceDeducted + data.deductionAmount;
    const newAdvanceBalance = employee.advanceBalance - data.deductionAmount;

    const newLedger = await prisma.advanceLedgerEntry.create({
      data: {
        employeeId: id,
        type: "DELIVERY_DEDUCTION",
        amount: data.deductionAmount,
        deliveryValue: data.deliveryValue,
        materialDescription: data.materialDescription,
        saleId: data.saleId,
        saleNumber: data.saleNumber,
        balanceAfter: newAdvanceBalance,
        notes: data.notes,
        recordedBy: data.recordedBy,
        date: data.date || new Date().toISOString(),
      },
    });

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        totalDeliveriesValue: newDeliveriesValue,
        totalAdvanceDeducted: newAdvanceDeducted,
        advanceBalance: newAdvanceBalance,
      },
    });

    return {
      ledger: newLedger,
      employee: updatedEmployee,
    };
  },
};
