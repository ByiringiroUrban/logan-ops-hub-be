import fs from "fs";
import path from "path";

export interface AdvanceLedgerEntry {
  id: string;
  employeeId: string;
  type: "ADVANCE_GIVEN" | "DELIVERY_DEDUCTION";
  date: string;
  amount: number; // For ADVANCE_GIVEN: advance added (+). For DELIVERY_DEDUCTION: fixed deduction amount from advance (-)
  deliveryValue?: number; // Full value of materials / stones / deliveries brought by employee (e.g. 45,000 RWF)
  materialDescription?: string;
  saleId?: string;
  saleNumber?: string;
  balanceAfter: number; // Remaining advance balance after this transaction (e.g. 90,000 RWF)
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface StoredEmployee {
  id: string;
  names: string;
  nationalId: string;
  phone: string;
  address: string;
  role: string;
  department: string;
  salary?: number;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  joinedDate: string;
  notes?: string;
  totalAdvance?: number; // Cumulative total advances granted
  totalAdvanceDeducted?: number; // Cumulative total advance deductions
  advanceBalance?: number; // Current remaining advance balance (totalAdvance - totalAdvanceDeducted)
  totalDeliveriesValue?: number; // Cumulative value of materials/deliveries brought by this employee
  advanceHistory?: AdvanceLedgerEntry[];
  createdAt: string;
}

const dataDir = path.join(__dirname, "../../data");
const filePath = path.join(dataDir, "employees.json");

const initialEmployees: StoredEmployee[] = [
  {
    id: "emp-001",
    names: "Jean Baptiste Mugisha",
    nationalId: "1 1988 8 0045231 1 24",
    phone: "+250 788 412 901",
    address: "Kigali, Gasabo, Kimironko",
    role: "Mining Operations Lead",
    department: "Field Operations",
    salary: 450000,
    status: "ACTIVE",
    joinedDate: "2023-03-15",
    notes: "Lead supervisor for Western sector mining sites.",
    createdAt: "2023-03-15T08:00:00.000Z",
  },
  {
    id: "emp-002",
    names: "Marie Claire Uwimana",
    nationalId: "1 1992 7 0089123 0 12",
    phone: "+250 783 552 144",
    address: "Kigali, Nyarugenge, Nyamirambo",
    role: "Quality Control Specialist",
    department: "Technical & Assay",
    salary: 400000,
    status: "ACTIVE",
    joinedDate: "2023-08-01",
    notes: "Handles laboratory sample assay and grade testing.",
    createdAt: "2023-08-01T08:00:00.000Z",
  },
  {
    id: "emp-003",
    names: "Emmanuel Nsengimana",
    nationalId: "1 1985 8 0012984 1 89",
    phone: "+250 788 920 334",
    address: "Northern Province, Musanze",
    role: "Heavy Excavator Operator",
    department: "Machinery & Equipment",
    salary: 350000,
    status: "ACTIVE",
    joinedDate: "2024-01-10",
    notes: "Licensed class F operator, CAT 320 excavator certified.",
    createdAt: "2024-01-10T08:00:00.000Z",
  },
  {
    id: "emp-004",
    names: "Claude Hakizimana",
    nationalId: "1 1990 8 0033412 1 67",
    phone: "+250 782 119 022",
    address: "Western Province, Karongi",
    role: "Field Safety & Compliance Officer",
    department: "Health & Safety",
    salary: 380000,
    status: "ON_LEAVE",
    joinedDate: "2023-11-20",
    notes: "On approved annual leave until end of month.",
    createdAt: "2023-11-20T08:00:00.000Z",
  },
  {
    id: "emp-005",
    names: "Alice Mukamana",
    nationalId: "1 1995 7 0077881 0 45",
    phone: "+250 788 650 918",
    address: "Kigali, Kicukiro, Gahanga",
    role: "Logistics & Dispatch Coordinator",
    department: "Logistics",
    salary: 320000,
    status: "ACTIVE",
    joinedDate: "2024-04-05",
    notes: "Manages material hauling weighbridge and waybills.",
    createdAt: "2024-04-05T08:00:00.000Z",
  },
];

function ensureFileExists(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialEmployees, null, 2), "utf8");
  }
}

export const employeeStorage = {
  getAll(): StoredEmployee[] {
    try {
      ensureFileExists();
      const raw = fs.readFileSync(filePath, "utf8");
      const list: StoredEmployee[] = JSON.parse(raw);
      return list.map((e) => {
        const totalAdvance = Number(e.totalAdvance) || 0;
        const totalAdvanceDeducted = Number(e.totalAdvanceDeducted) || 0;
        const advanceBalance =
          e.advanceBalance !== undefined
            ? Number(e.advanceBalance)
            : Math.max(0, totalAdvance - totalAdvanceDeducted);
        return {
          ...e,
          totalAdvance,
          totalAdvanceDeducted,
          advanceBalance,
          totalDeliveriesValue: Number(e.totalDeliveriesValue) || 0,
          advanceHistory: Array.isArray(e.advanceHistory) ? e.advanceHistory : [],
        };
      });
    } catch {
      return initialEmployees.map((e) => ({
        ...e,
        totalAdvance: 0,
        totalAdvanceDeducted: 0,
        advanceBalance: 0,
        totalDeliveriesValue: 0,
        advanceHistory: [],
      }));
    }
  },

  getById(id: string): StoredEmployee | null {
    const list = this.getAll();
    return list.find((e) => e.id === id) || null;
  },

  create(data: Omit<StoredEmployee, "id" | "createdAt">): StoredEmployee {
    ensureFileExists();
    const list = this.getAll();
    const newEmployee: StoredEmployee = {
      id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      names: data.names.trim(),
      nationalId: data.nationalId.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      role: (data.role || "Field Worker").trim(),
      department: (data.department || "Field Operations").trim(),
      salary: data.salary ? Number(data.salary) : undefined,
      status: data.status || "ACTIVE",
      joinedDate: data.joinedDate || new Date().toISOString().slice(0, 10),
      notes: data.notes?.trim() || undefined,
      totalAdvance: Number(data.totalAdvance) || 0,
      totalAdvanceDeducted: Number(data.totalAdvanceDeducted) || 0,
      advanceBalance:
        Number(data.totalAdvance || 0) - Number(data.totalAdvanceDeducted || 0),
      totalDeliveriesValue: Number(data.totalDeliveriesValue) || 0,
      advanceHistory: data.advanceHistory || [],
      createdAt: new Date().toISOString(),
    };
    list.unshift(newEmployee);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return newEmployee;
  },

  update(id: string, patch: Partial<StoredEmployee>): StoredEmployee | null {
    ensureFileExists();
    const list = this.getAll();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const current = list[idx];
    const totalAdvance =
      patch.totalAdvance !== undefined ? Number(patch.totalAdvance) : current.totalAdvance || 0;
    const totalAdvanceDeducted =
      patch.totalAdvanceDeducted !== undefined
        ? Number(patch.totalAdvanceDeducted)
        : current.totalAdvanceDeducted || 0;
    const advanceBalance =
      patch.advanceBalance !== undefined
        ? Number(patch.advanceBalance)
        : Math.max(0, totalAdvance - totalAdvanceDeducted);

    const updated: StoredEmployee = {
      ...current,
      ...patch,
      totalAdvance,
      totalAdvanceDeducted,
      advanceBalance,
      id: current.id,
      createdAt: current.createdAt,
    };
    list[idx] = updated;
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return updated;
  },

  recordAdvance(
    employeeId: string,
    data: { amount: number; notes?: string; recordedBy?: string; date?: string; paymentMethod?: string }
  ): { employee: StoredEmployee; entry: AdvanceLedgerEntry } | null {
    ensureFileExists();
    const list = this.getAll();
    const idx = list.findIndex((e) => e.id === employeeId);
    if (idx === -1) return null;

    const emp = list[idx];
    const amount = Number(data.amount) || 0;
    const prevTotal = Number(emp.totalAdvance) || 0;
    const prevDeducted = Number(emp.totalAdvanceDeducted) || 0;
    const newTotal = prevTotal + amount;
    const newBalance = Math.max(0, newTotal - prevDeducted);

    const history = Array.isArray(emp.advanceHistory) ? [...emp.advanceHistory] : [];
    const entry: AdvanceLedgerEntry = {
      id: `adv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId,
      type: "ADVANCE_GIVEN",
      date: data.date || new Date().toISOString().slice(0, 10),
      amount,
      balanceAfter: newBalance,
      paymentMethod: data.paymentMethod || "CASH",
      notes: data.notes?.trim() || undefined,
      recordedBy: data.recordedBy?.trim() || "Boss / Management",
      createdAt: new Date().toISOString(),
    };

    history.unshift(entry);

    const updated: StoredEmployee = {
      ...emp,
      totalAdvance: newTotal,
      advanceBalance: newBalance,
      advanceHistory: history,
    };

    list[idx] = updated;
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return { employee: updated, entry };
  },

  recordDeduction(
    employeeId: string,
    data: {
      deductionAmount: number;
      deliveryValue: number;
      materialDescription?: string;
      saleId?: string;
      saleNumber?: string;
      notes?: string;
      recordedBy?: string;
      date?: string;
    }
  ): { employee: StoredEmployee; entry: AdvanceLedgerEntry } | null {
    ensureFileExists();
    const list = this.getAll();
    const idx = list.findIndex((e) => e.id === employeeId);
    if (idx === -1) return null;

    const emp = list[idx];
    const deduction = Number(data.deductionAmount) || 0;
    const deliveryVal = Number(data.deliveryValue) || 0;
    const prevTotal = Number(emp.totalAdvance) || 0;
    const prevDeducted = Number(emp.totalAdvanceDeducted) || 0;
    const prevDeliveries = Number(emp.totalDeliveriesValue) || 0;

    const newDeducted = prevDeducted + deduction;
    const newBalance = Math.max(0, prevTotal - newDeducted);
    const newDeliveries = prevDeliveries + deliveryVal;

    const history = Array.isArray(emp.advanceHistory) ? [...emp.advanceHistory] : [];
    const entry: AdvanceLedgerEntry = {
      id: `adv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId,
      type: "DELIVERY_DEDUCTION",
      date: data.date || new Date().toISOString().slice(0, 10),
      amount: deduction, // Amount deducted from advance
      deliveryValue: deliveryVal, // Full value of materials / stones brought by employee
      materialDescription: data.materialDescription?.trim() || undefined,
      saleId: data.saleId,
      saleNumber: data.saleNumber,
      balanceAfter: newBalance,
      notes: data.notes?.trim() || undefined,
      recordedBy: data.recordedBy?.trim() || "Boss / Management",
      createdAt: new Date().toISOString(),
    };

    history.unshift(entry);

    const updated: StoredEmployee = {
      ...emp,
      totalAdvanceDeducted: newDeducted,
      advanceBalance: newBalance,
      totalDeliveriesValue: newDeliveries,
      advanceHistory: history,
    };

    list[idx] = updated;
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    return { employee: updated, entry };
  },

  delete(id: string): boolean {
    ensureFileExists();
    const list = this.getAll();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  },
};
