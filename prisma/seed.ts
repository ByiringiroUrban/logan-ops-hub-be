import { PrismaClient, Role, UserStatus, ProductStatus, TransactionStatus, ExpenseCategory, DocumentCategory, FileType, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.companyDocument.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // Users
  const usersData = [
    {
      id: "u-joseph-admin",
      name: "HABIMANA Joseph Collins",
      email: "josephcollin87@gmail.com",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      phone: "+250 788 808 188",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-01-01T08:00:00Z"),
      lastLogin: new Date(),
    },
    {
      id: "u-urban-admin",
      name: "Urban Byiringiro",
      email: "byiringirourban20@gmail.com",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      phone: "+250 788 854 243",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-01-01T08:00:00Z"),
      lastLogin: new Date(),
    },
    {
      id: "u-urban-supervisor",
      name: "Urban Pac",
      email: "urbanpac20@gmail.com",
      passwordHash: defaultPasswordHash,
      role: Role.FIELD_SUPERVISOR,
      phone: "+250 788 668 243",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-01-02T08:00:00Z"),
      lastLogin: new Date(),
    },
    {
      id: "u1",
      name: "Jean Claude Habimana",
      email: "admin@loganinvestment.com",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      phone: "+250 788 123 456",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-01-10T08:00:00Z"),
      lastLogin: new Date("2026-08-12T10:30:00Z"),
    },
    {
      id: "u2",
      name: "Eric Nshimiyimana",
      email: "supervisor@loganinvestment.com",
      passwordHash: defaultPasswordHash,
      role: Role.FIELD_SUPERVISOR,
      phone: "+250 788 234 567",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-01-15T09:00:00Z"),
      lastLogin: new Date("2026-08-12T09:15:00Z"),
    },
    {
      id: "u3",
      name: "Diane Uwase",
      email: "diane.uwase@loganinvestment.com",
      passwordHash: defaultPasswordHash,
      role: Role.FIELD_SUPERVISOR,
      phone: "+250 788 345 678",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-02-01T10:00:00Z"),
      lastLogin: new Date("2026-08-11T16:45:00Z"),
    },
    {
      id: "u4",
      name: "Patrick Mugisha",
      email: "patrick.mugisha@loganinvestment.com",
      passwordHash: defaultPasswordHash,
      role: Role.FIELD_SUPERVISOR,
      phone: "+250 788 456 789",
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      createdAt: new Date("2026-03-10T11:00:00Z"),
      lastLogin: new Date("2026-08-10T14:20:00Z"),
    },
    {
      id: "u5",
      name: "Grace Mukamana",
      email: "grace.mukamana@loganinvestment.com",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      phone: "+250 788 567 890",
      avatarUrl: null,
      status: UserStatus.INACTIVE,
      createdAt: new Date("2026-04-05T14:00:00Z"),
      lastLogin: null,
    },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  // Products
  const productsData = [
    {
      id: "p1",
      name: "Amabuye Manini",
      description: "Large foundation stones for major civil engineering works",
      unit: "m³",
      unitPrice: 12000,
      status: ProductStatus.ACTIVE,
    },
    {
      id: "p2",
      name: "Amabuye Mato",
      description: "Medium aggregates for masonry and structural walls",
      unit: "m³",
      unitPrice: 9000,
      status: ProductStatus.ACTIVE,
    },
    {
      id: "p3",
      name: "Ibiparara",
      description: "Coarse crushed stone chips for road sub-base",
      unit: "tonne",
      unitPrice: 10500,
      status: ProductStatus.ACTIVE,
    },
    {
      id: "p4",
      name: "Concasse",
      description: "Fine crushed stone aggregate for concrete mixing",
      unit: "m³",
      unitPrice: 8000,
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({ data: p });
  }

  // Clients
  const clientsData = [
    { id: "c1", name: "Kigali Construction Ltd", phone: "+250 788 111 222", email: "info@kigaliconst.rw", address: "Nyarugenge, Kigali", notes: "Primary client for large stones", createdAt: new Date("2026-01-20T10:00:00Z") },
    { id: "c2", name: "Horizon Builders Rwanda", phone: "+250 788 222 333", email: "procurement@horizonbuilders.rw", address: "Gasabo, Kigali", notes: "Prefers weekly invoicing", createdAt: new Date("2026-02-05T11:00:00Z") },
    { id: "c3", name: "Real Contractors Co.", phone: "+250 788 333 444", email: "contact@realcontractors.rw", address: "Kicukiro, Kigali", notes: null, createdAt: new Date("2026-02-18T14:00:00Z") },
    { id: "c4", name: "Rwanda Infrastructure Works", phone: "+250 788 444 555", email: "riw@infrastructure.gov.rw", address: "Remera, Kigali", notes: "Government infrastructure partner", createdAt: new Date("2026-03-01T09:00:00Z") },
    { id: "c5", name: "Alpha Civil Engineering", phone: "+250 788 555 666", email: "orders@alphacivil.rw", address: "Bugesera, Eastern Province", notes: null, createdAt: new Date("2026-03-12T15:00:00Z") },
  ];

  for (const c of clientsData) {
    await prisma.client.create({ data: c });
  }

  // Documents
  const docsData = [
    {
      id: "d1",
      name: "Logan Investment RDB Registration Certificate",
      category: DocumentCategory.Company_Registration,
      fileType: FileType.PDF,
      sizeKb: 842,
      uploadedBy: "Jean Claude Habimana",
      uploadedAt: new Date("2026-01-15T10:00:00Z"),
    },
    {
      id: "d2",
      name: "Quarry Operating License 2026",
      category: DocumentCategory.Mining_License,
      fileType: FileType.PDF,
      sizeKb: 1204,
      uploadedBy: "Grace Mukamana",
      uploadedAt: new Date("2026-02-02T14:20:00Z"),
    },
    {
      id: "d3",
      name: "Supply Contract - Kigali Construction Ltd",
      category: DocumentCategory.Client_Contracts,
      fileType: FileType.DOCX,
      sizeKb: 356,
      uploadedBy: "Jean Claude Habimana",
      uploadedAt: new Date("2026-04-11T09:45:00Z"),
    },
    {
      id: "d4",
      name: "Environmental Compliance Certificate",
      category: DocumentCategory.Environmental_Permit,
      fileType: FileType.PDF,
      sizeKb: 690,
      uploadedBy: "Grace Mukamana",
      uploadedAt: new Date("2026-05-23T11:30:00Z"),
    },
    {
      id: "d5",
      name: "July 2026 Tax Compliance Summary",
      category: DocumentCategory.Tax_Compliance,
      fileType: FileType.XLSX,
      sizeKb: 214,
      uploadedBy: "Jean Claude Habimana",
      uploadedAt: new Date("2026-08-01T08:10:00Z"),
    },
  ];

  for (const d of docsData) {
    await prisma.companyDocument.create({ data: d });
  }

  // Notifications
  const notificationsData = [
    {
      id: "n1",
      title: "New transaction recorded",
      message: "Eric Nshimiyimana recorded 20 m³ of Amabuye Manini.",
      createdAt: new Date("2026-08-12T10:35:00Z"),
      read: false,
      type: NotificationType.transaction,
      targetRole: Role.ADMIN,
    },
    {
      id: "n2",
      title: "New client added",
      message: "Kigali Construction Ltd was added to the client list.",
      createdAt: new Date("2026-08-12T09:12:00Z"),
      read: false,
      type: NotificationType.client,
      targetRole: Role.FIELD_SUPERVISOR,
    },
    {
      id: "n3",
      title: "Document uploaded",
      message: "Logan Investment RDB Registration Certificate was uploaded.",
      createdAt: new Date("2026-08-11T16:20:00Z"),
      read: true,
      type: NotificationType.document,
      targetRole: Role.ADMIN,
    },
    {
      id: "n4",
      title: "System maintenance completed",
      message: "All operational databases and backups are up to date.",
      createdAt: new Date("2026-08-10T14:00:00Z"),
      read: true,
      type: NotificationType.system,
      targetRole: null,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  // Seed sample transactions
  await prisma.transaction.create({
    data: {
      id: "TRX-1001",
      clientId: "c1",
      productId: "p1",
      quantity: 10,
      unitPrice: 12000,
      totalAmount: 120000,
      date: new Date("2026-08-12T14:00:00Z"),
      recordedBy: "Eric Nshimiyimana",
      status: TransactionStatus.COMPLETED,
    },
  });

  await prisma.transaction.create({
    data: {
      id: "TRX-1002",
      clientId: "c2",
      productId: "p2",
      quantity: 15,
      unitPrice: 9000,
      totalAmount: 135000,
      date: new Date("2026-08-12T11:20:00Z"),
      recordedBy: "Diane Uwase",
      status: TransactionStatus.PENDING,
    },
  });

  // Seed sample expenses
  await prisma.expense.create({
    data: {
      id: "e1",
      title: "Quarry Truck Fuel",
      category: ExpenseCategory.Fuel,
      amount: 350000,
      date: new Date("2026-08-12T08:00:00Z"),
      description: "Diesel refuel for 2 heavy haul trucks",
      addedBy: "Jean Claude Habimana",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
