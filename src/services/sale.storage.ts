import fs from "fs";
import path from "path";

export interface StoredSale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  clientId?: string;
  productName: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: "CASH" | "MOMO" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";
  paymentStatus: "PAID" | "PENDING" | "PARTIAL";
  saleDate: string;
  soldBy: string;
  employeeId?: string; // Employee who brought the delivery/materials
  employeeName?: string;
  advanceDeducted?: number; // Specific fixed amount deducted from employee's advance balance
  deliveryValue?: number; // Full value of delivery/materials
  notes?: string;
  createdAt: string;
}

const dataDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "../../data");
const filePath = path.join(dataDir, "sales.json");

const initialSales: StoredSale[] = [
  {
    id: "sale-001",
    saleNumber: "SAL-2026-001",
    customerName: "Kigali Mining Supply Ltd",
    customerPhone: "+250 788 123 456",
    customerAddress: "Kigali, Gikondo Industrial Zone",
    productName: "Coltan (Tantalite Ore 30%)",
    quantity: 250,
    unitPrice: 35000,
    totalAmount: 8750000,
    amountPaid: 8750000,
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    saleDate: "2026-09-25",
    soldBy: "Urban Byiringiro",
    notes: "High purity mineral batch #418, certificate attached.",
    createdAt: "2026-09-25T10:30:00.000Z",
  },
  {
    id: "sale-002",
    saleNumber: "SAL-2026-002",
    customerName: "Rwanda Aggregate & Stone Co.",
    customerPhone: "+250 788 654 321",
    customerAddress: "Kicukiro, Gahanga",
    productName: "Crushed Stone / Gravel (0-20mm)",
    quantity: 120,
    unitPrice: 18000,
    totalAmount: 2160000,
    amountPaid: 2160000,
    paymentMethod: "MOMO",
    paymentStatus: "PAID",
    saleDate: "2026-09-26",
    soldBy: "Eric Nshimiyimana",
    notes: "Direct quarry dispatch to Gahanga construction site.",
    createdAt: "2026-09-26T14:15:00.000Z",
  },
  {
    id: "sale-003",
    saleNumber: "SAL-2026-003",
    customerName: "Horizon Construction Ltd",
    customerPhone: "+250 789 334 221",
    customerAddress: "Nyarugenge, City Center",
    productName: "Fine Washed River Sand",
    quantity: 80,
    unitPrice: 22000,
    totalAmount: 1760000,
    amountPaid: 1000000,
    paymentMethod: "CASH",
    paymentStatus: "PARTIAL",
    saleDate: "2026-09-27",
    soldBy: "Urban Byiringiro",
    notes: "Initial deposit paid. Balance 760,000 RWF due on delivery confirmation.",
    createdAt: "2026-09-27T09:00:00.000Z",
  },
];

function ensureFileExists(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialSales, null, 2), "utf8");
  }
}

export const saleStorage = {
  getAll(): StoredSale[] {
    try {
      ensureFileExists();
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    } catch {
      return initialSales;
    }
  },

  getById(id: string): StoredSale | null {
    const list = this.getAll();
    return list.find((s) => s.id === id) || null;
  },

  create(data: Omit<StoredSale, "id" | "createdAt" | "totalAmount"> & { totalAmount?: number }): StoredSale {
    ensureFileExists();
    const list = this.getAll();
    const quantity = Number(data.quantity) || 0;
    const unitPrice = Number(data.unitPrice) || 0;
    const totalAmount = data.totalAmount ?? quantity * unitPrice;
    const amountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : totalAmount;

    // Auto-generate saleNumber if missing
    let saleNumber = data.saleNumber?.trim();
    if (!saleNumber) {
      const year = new Date().getFullYear();
      const count = list.length + 1;
      saleNumber = `SAL-${year}-${String(count).padStart(3, "0")}`;
    }

    const newSale: StoredSale = {
      id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      saleNumber,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone?.trim() || undefined,
      customerAddress: data.customerAddress?.trim() || undefined,
      clientId: data.clientId || undefined,
      productName: data.productName.trim(),
      productId: data.productId || undefined,
      quantity,
      unitPrice,
      totalAmount,
      amountPaid,
      paymentMethod: data.paymentMethod || "CASH",
      paymentStatus: data.paymentStatus || (amountPaid >= totalAmount ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING"),
      saleDate: data.saleDate || new Date().toISOString().slice(0, 10),
      soldBy: data.soldBy?.trim() || "Field Officer",
      employeeId: data.employeeId || undefined,
      employeeName: data.employeeName?.trim() || undefined,
      advanceDeducted: data.advanceDeducted !== undefined ? Number(data.advanceDeducted) : undefined,
      deliveryValue: data.deliveryValue !== undefined ? Number(data.deliveryValue) : totalAmount,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newSale);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return newSale;
  },

  update(id: string, patch: Partial<StoredSale>): StoredSale | null {
    ensureFileExists();
    const list = this.getAll();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const current = list[idx];
    const quantity = patch.quantity !== undefined ? Number(patch.quantity) : current.quantity;
    const unitPrice = patch.unitPrice !== undefined ? Number(patch.unitPrice) : current.unitPrice;
    const totalAmount = patch.totalAmount !== undefined ? Number(patch.totalAmount) : quantity * unitPrice;
    const amountPaid = patch.amountPaid !== undefined ? Number(patch.amountPaid) : current.amountPaid;

    const updated: StoredSale = {
      ...current,
      ...patch,
      quantity,
      unitPrice,
      totalAmount,
      amountPaid,
      employeeId: patch.employeeId !== undefined ? patch.employeeId : current.employeeId,
      employeeName: patch.employeeName !== undefined ? patch.employeeName : current.employeeName,
      advanceDeducted:
        patch.advanceDeducted !== undefined ? Number(patch.advanceDeducted) : current.advanceDeducted,
      deliveryValue:
        patch.deliveryValue !== undefined ? Number(patch.deliveryValue) : current.deliveryValue ?? totalAmount,
      id: current.id,
      createdAt: current.createdAt,
    };

    list[idx] = updated;
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return updated;
  },

  delete(id: string): boolean {
    ensureFileExists();
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  },
};
