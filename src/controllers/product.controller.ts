import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { NotificationType, ProductStatus } from "@prisma/client";

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

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "added a new product",
          target: product.name,
        },
      });

      await prisma.notification.create({
        data: {
          title: "New product added",
          message: `Product "${product.name}" was added to product catalog.`,
          type: NotificationType.system,
        },
      });
    } catch {
      /* ignore non-blocking activity log error */
    }

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

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "updated product details",
          target: product.name,
        },
      });
    } catch {
      /* ignore non-blocking activity log error */
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update product" });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Safely delete associated transactions then the product in a single atomic transaction
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "deleted product",
          target: product.name,
        },
      });

      await prisma.notification.create({
        data: {
          title: "Product deleted",
          message: `Product "${product.name}" was removed from the system.`,
          type: NotificationType.system,
        },
      });
    } catch {
      /* ignore non-blocking activity log error */
    }

    console.log(`[PRODUCT LOG] 🗑️ Product "${product.name}" (ID: ${id}) deleted by ${actor}`);

    res.json({
      success: true,
      id,
      message: `Product "${product.name}" deleted successfully`,
    });
  } catch (error: any) {
    console.error("[PRODUCT ERROR] Failed to delete product:", error);
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
};
