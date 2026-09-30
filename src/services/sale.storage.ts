import { prisma } from "../config/prisma";
import { Sale } from "@prisma/client";

export const saleStorage = {
  getAll: async () => {
    return prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  getById: async (id: string) => {
    return prisma.sale.findUnique({
      where: { id },
    });
  },

  create: async (data: Omit<Sale, "id" | "createdAt">) => {
    return prisma.sale.create({
      data: {
        ...data,
      },
    });
  },

  update: async (id: string, updates: Partial<Sale>) => {
    return prisma.sale.update({
      where: { id },
      data: updates,
    });
  },

  delete: async (id: string) => {
    try {
      await prisma.sale.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  },
};
