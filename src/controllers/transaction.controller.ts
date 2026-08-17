import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { NotificationType, TransactionStatus } from "@prisma/client";

export const listTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        client: { select: { name: true } },
        product: { select: { name: true, unit: true } },
      },
      orderBy: { date: "desc" },
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      clientId: t.clientId,
      clientName: t.client ? t.client.name : "Unknown",
      productId: t.productId,
      productName: t.product ? t.product.name : "Unknown",
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      totalAmount: t.totalAmount,
      date: t.date.toISOString(),
      notes: t.notes || undefined,
      recordedBy: t.recordedBy,
      status: t.status,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch transactions" });
  }
};

export const getTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const t = await prisma.transaction.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        product: { select: { name: true, unit: true } },
      },
    });

    if (!t) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json({
      id: t.id,
      clientId: t.clientId,
      clientName: t.client ? t.client.name : "Unknown",
      productId: t.productId,
      productName: t.product ? t.product.name : "Unknown",
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      totalAmount: t.totalAmount,
      date: t.date.toISOString(),
      notes: t.notes || undefined,
      recordedBy: t.recordedBy,
      status: t.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch transaction" });
  }
};

export const createTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      clientId,
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      productId,
      quantity,
      unitPrice,
      notes,
      date,
      status,
      recordedBy,
    } = req.body;

    if (!productId || quantity === undefined) {
      res.status(400).json({ error: "Product and quantity are required" });
      return;
    }

    let client: any = null;

    // 1. Search by explicit clientId if provided
    if (clientId) {
      client = await prisma.client.findUnique({ where: { id: clientId } });
    }

    // 2. If client not found by ID or if clientPhone/clientName passed, search DB by phone or name to prevent duplicates
    const phoneInput = (clientPhone || "").trim();
    const nameInput = (clientName || "").trim();
    const cleanDigits = phoneInput.replace(/\D/g, "");

    if (!client && (cleanDigits.length >= 7 || nameInput)) {
      const phoneVariations: string[] = [];
      if (cleanDigits.length >= 7) {
        const localNum = cleanDigits.slice(-9);
        phoneVariations.push(
          phoneInput,
          `0${localNum}`,
          `+250${localNum}`,
          `+250 ${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
          `0${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
          cleanDigits
        );
      }

      client = await prisma.client.findFirst({
        where: {
          OR: [
            ...(phoneVariations.length > 0 ? [{ phone: { in: phoneVariations } }] : []),
            ...(cleanDigits.length >= 7 ? [{ phone: { contains: cleanDigits.slice(-7) } }] : []),
            ...(nameInput ? [{ name: { equals: nameInput, mode: "insensitive" as const } }] : []),
          ],
        },
      });
    }

    // 3. If client does NOT exist yet, create a new Client record automatically
    if (!client) {
      const finalName = nameInput || (phoneInput ? `Client ${phoneInput}` : "New Client");
      client = await prisma.client.create({
        data: {
          name: finalName,
          phone: phoneInput || "+250 788 000 000",
          address: (clientAddress || "").trim() || "Kigali, Rwanda",
          email: (clientEmail || "").trim() || null,
          notes: "Created automatically via sales transaction",
        },
      });

      await prisma.activity.create({
        data: {
          actor: recordedBy || req.user?.name || "System",
          action: "registered new client",
          target: client.name,
        },
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(400).json({ error: "Product not found" });
      return;
    }

    const price = unitPrice !== undefined ? Number(unitPrice) : product.unitPrice;
    const qty = Number(quantity);
    const recorder = recordedBy || req.user?.name || "System";

    // 4. Check if an existing transaction for this (clientId, productId) already exists!
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        clientId: client.id,
        productId: product.id,
        status: { not: TransactionStatus.CANCELLED },
      },
      orderBy: { date: "desc" },
    });

    let transaction: any;

    if (existingTransaction) {
      // Accumulate into existing transaction record (same Client + same Product)
      const newQuantity = existingTransaction.quantity + qty;
      const newUnitPrice = price;
      const newTotalAmount = newQuantity * newUnitPrice;
      const updatedNotes = notes
        ? existingTransaction.notes
          ? `${existingTransaction.notes} | ${notes}`
          : notes
        : existingTransaction.notes;

      transaction = await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          totalAmount: newTotalAmount,
          date: date ? new Date(date) : new Date(),
          recordedBy: recorder,
          notes: updatedNotes,
          ...(status ? { status } : {}),
        },
      });

      await prisma.activity.create({
        data: {
          actor: recorder,
          action: `updated sales record (+${qty} ${product.unit}) for`,
          target: `${client.name} — ${product.name}`,
        },
      });

      await prisma.notification.create({
        data: {
          title: "Transaction updated",
          message: `${recorder} added +${qty} ${product.unit} of ${product.name} to existing record for ${client.name} (Total Qty: ${newQuantity}).`,
          type: NotificationType.transaction,
          targetRole: null,
        },
      });
    } else {
      // Create new transaction for a new/different product
      const totalAmount = qty * price;
      const customId = `TRX-${Date.now().toString().slice(-6)}`;

      transaction = await prisma.transaction.create({
        data: {
          id: customId,
          clientId: client.id,
          productId: product.id,
          quantity: qty,
          unitPrice: price,
          totalAmount,
          date: date ? new Date(date) : new Date(),
          notes: notes || null,
          recordedBy: recorder,
          status: status || TransactionStatus.COMPLETED,
        },
      });

      await prisma.activity.create({
        data: {
          actor: recorder,
          action: "recorded a new product transaction for",
          target: `${client.name} — ${product.name}`,
        },
      });

      await prisma.notification.create({
        data: {
          title: "New transaction recorded",
          message: `${recorder} recorded ${qty} ${product.unit} of ${product.name} for ${client.name}.`,
          type: NotificationType.transaction,
          targetRole: null,
        },
      });
    }

    res.status(201).json({
      id: transaction.id,
      clientId: transaction.clientId,
      clientName: client.name,
      productId: transaction.productId,
      productName: product.name,
      quantity: transaction.quantity,
      unitPrice: transaction.unitPrice,
      totalAmount: transaction.totalAmount,
      date: transaction.date.toISOString(),
      notes: transaction.notes || undefined,
      recordedBy: transaction.recordedBy,
      status: transaction.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create transaction" });
  }
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { clientId, productId, quantity, unitPrice, notes, date, status } = req.body;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const newClientId = clientId || existing.clientId;
    const newProductId = productId || existing.productId;
    const client = await prisma.client.findUnique({ where: { id: newClientId } });
    const product = await prisma.product.findUnique({ where: { id: newProductId } });

    if (!client || !product) {
      res.status(400).json({ error: "Invalid client or product" });
      return;
    }

    const newQty = quantity !== undefined ? Number(quantity) : existing.quantity;
    const newUnitPrice = unitPrice !== undefined ? Number(unitPrice) : existing.unitPrice;
    const newTotal = newQty * newUnitPrice;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        clientId: newClientId,
        productId: newProductId,
        quantity: newQty,
        unitPrice: newUnitPrice,
        totalAmount: newTotal,
        notes: notes !== undefined ? (notes || null) : existing.notes,
        date: date ? new Date(date) : existing.date,
        status: status || existing.status,
      },
    });

    res.json({
      id: transaction.id,
      clientId: transaction.clientId,
      clientName: client.name,
      productId: transaction.productId,
      productName: product.name,
      quantity: transaction.quantity,
      unitPrice: transaction.unitPrice,
      totalAmount: transaction.totalAmount,
      date: transaction.date.toISOString(),
      notes: transaction.notes || undefined,
      recordedBy: transaction.recordedBy,
      status: transaction.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update transaction" });
  }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete transaction" });
  }
};
