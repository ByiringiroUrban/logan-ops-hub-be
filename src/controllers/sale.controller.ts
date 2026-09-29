import { Response } from "express";
import { saleStorage } from "../services/sale.storage";
import { employeeStorage } from "../services/employee.storage";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { NotificationType } from "@prisma/client";

export const listSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = saleStorage.getAll();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch sales" });
  }
};

export const getSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const sale = saleStorage.getById(id);
    if (!sale) {
      res.status(404).json({ error: "Sale record not found" });
      return;
    }
    res.json(sale);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch sale" });
  }
};

export const createSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      saleNumber,
      customerName,
      customerPhone,
      customerAddress,
      clientId,
      productName,
      productId,
      quantity,
      unitPrice,
      totalAmount,
      amountPaid,
      paymentMethod,
      paymentStatus,
      saleDate,
      soldBy,
      employeeId,
      employeeName,
      advanceDeducted,
      deliveryValue,
      notes,
    } = req.body;

    if (!customerName || !productName || quantity === undefined || unitPrice === undefined) {
      res.status(400).json({
        error: "Customer name, product name, quantity, and unit price are required.",
      });
      return;
    }

    const recordedSoldBy = soldBy || req.user?.name || "Field Officer";

    const computedTotal = totalAmount !== undefined ? Number(totalAmount) : Number(quantity) * Number(unitPrice);
    const resolvedPaid = amountPaid !== undefined ? Number(amountPaid) : computedTotal;

    // Resolve employee name if employeeId was provided
    let resolvedEmployeeName = employeeName;
    if (employeeId && !resolvedEmployeeName) {
      const emp = employeeStorage.getById(employeeId);
      if (emp) resolvedEmployeeName = emp.names;
    }

    const resolvedDeduction = advanceDeducted !== undefined ? Number(advanceDeducted) : 0;
    const resolvedDeliveryValue = deliveryValue !== undefined ? Number(deliveryValue) : computedTotal;

    const newSale = saleStorage.create({
      saleNumber,
      customerName,
      customerPhone,
      customerAddress,
      clientId,
      productName,
      productId,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount: computedTotal,
      amountPaid: resolvedPaid,
      paymentMethod: paymentMethod || "CASH",
      paymentStatus,
      saleDate: saleDate || new Date().toISOString().slice(0, 10),
      soldBy: recordedSoldBy,
      employeeId: employeeId || undefined,
      employeeName: resolvedEmployeeName || undefined,
      advanceDeducted: resolvedDeduction > 0 ? resolvedDeduction : undefined,
      deliveryValue: resolvedDeliveryValue,
      notes,
    });

    const actor = req.user?.name || recordedSoldBy;

    // If an employee brought this delivery and had a fixed advance deduction, record it in employee advance ledger!
    if (employeeId && resolvedDeduction > 0) {
      try {
        employeeStorage.recordDeduction(employeeId, {
          deductionAmount: resolvedDeduction,
          deliveryValue: computedTotal, // Full value of delivery/materials
          materialDescription: newSale.productName,
          saleId: newSale.id,
          saleNumber: newSale.saleNumber,
          notes: notes || `Advance deduction for sale/delivery ${newSale.saleNumber}`,
          recordedBy: actor,
          date: newSale.saleDate,
        });
      } catch (err) {
        console.error("Failed to link advance deduction to employee:", err);
      }
    }

    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "recorded a new sale",
          target: `${newSale.saleNumber} - ${newSale.productName} to ${newSale.customerName}${
            resolvedEmployeeName ? ` (Delivered by ${resolvedEmployeeName})` : ""
          }`,
        },
      });

      await prisma.notification.create({
        data: {
          title: "New Sale Recorded",
          message: `Sale ${newSale.saleNumber} for ${newSale.totalAmount.toLocaleString()} RWF was recorded by ${actor}.`,
          type: NotificationType.transaction,
        },
      });
    } catch {
      // Continue
    }

    res.status(201).json(newSale);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create sale record" });
  }
};

export const updateSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = saleStorage.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Sale record not found" });
      return;
    }

    const updated = saleStorage.update(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Sale record not found" });
      return;
    }

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "updated sale record",
          target: `${updated.saleNumber} - ${updated.customerName}`,
        },
      });
    } catch {
      // Continue
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update sale record" });
  }
};

export const deleteSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = saleStorage.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Sale record not found" });
      return;
    }

    const success = saleStorage.delete(id);
    if (!success) {
      res.status(404).json({ error: "Sale record not found" });
      return;
    }

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "deleted sale record",
          target: `${existing.saleNumber} (${existing.customerName})`,
        },
      });
    } catch {
      // Continue
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete sale record" });
  }
};
