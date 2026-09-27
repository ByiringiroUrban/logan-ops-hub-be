import fs from "fs";
import path from "path";

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
      return JSON.parse(raw);
    } catch {
      return initialEmployees;
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
    const updated: StoredEmployee = {
      ...current,
      ...patch,
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
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  },
};
