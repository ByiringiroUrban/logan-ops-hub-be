import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { ProductStatus } from "@prisma/client";

export const listProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
};

export const getProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch product" });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, unit, unitPrice, status } = req.body;

    if (!name || !unit || unitPrice === undefined) {
      res.status(400).json({ error: "Name, unit, and unit price are required" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        unit,
        unitPrice: Number(unitPrice),
        status: status === "INACTIVE" ? ProductStatus.INACTIVE : ProductStatus.ACTIVE,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create product" });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, description, unit, unitPrice, status } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        unit: unit !== undefined ? unit : existing.unit,
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : existing.unitPrice,
        status: status !== undefined ? (status === "INACTIVE" ? ProductStatus.INACTIVE : ProductStatus.ACTIVE) : existing.status,
      },
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update product" });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
};
