import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { NotificationType } from "@prisma/client";

export const listClients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });

    const formatted = clients.map((c) => ({
      ...c,
      email: c.email || undefined,
      notes: c.notes || undefined,
      createdAt: c.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch clients" });
  }
};

export const getClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json({
      ...client,
      email: client.email || undefined,
      notes: client.notes || undefined,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch client" });
  }
};

export const createClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!name || !phone || !address) {
      res.status(400).json({ error: "Name, phone, and address are required" });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email: email || null,
        address,
        notes: notes || null,
      },
    });

    const actor = req.user?.name || "System";
    await prisma.activity.create({
      data: {
        actor,
        action: "added a new client",
        target: client.name,
      },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        title: "New client added",
        message: `${client.name} was added to the client list.`,
        type: NotificationType.client,
      },
    });

    res.status(201).json({
      ...client,
      email: client.email || undefined,
      notes: client.notes || undefined,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create client" });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, phone, email, address, notes } = req.body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? (email || null) : existing.email,
        address: address !== undefined ? address : existing.address,
        notes: notes !== undefined ? (notes || null) : existing.notes,
      },
    });

    const actor = req.user?.name || "System";
    await prisma.activity.create({
      data: {
        actor,
        action: "updated the client",
        target: client.name,
      },
      select: { id: true },
    });

    res.json({
      ...client,
      email: client.email || undefined,
      notes: client.notes || undefined,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update client" });
  }
};

export const deleteClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.client.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete client" });
  }
};
