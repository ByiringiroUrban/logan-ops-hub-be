import bcrypt from "bcryptjs";
import { prisma } from "./config/prisma";
import { Role, UserStatus } from "@prisma/client";

async function seedUrbanUsers() {
  console.log("==================================================");
  console.log("🌱 UPSERTING URBAN USERS IN NEON POSTGRESQL DB");
  console.log("==================================================");

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Admin Account
    const admin = await prisma.user.upsert({
      where: { email: "byiringirourban20@gmail.com" },
      update: {
        name: "Urban Byiringiro",
        phone: "+250 788 854 243",
        role: Role.ADMIN,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: "u-urban-admin",
        name: "Urban Byiringiro",
        email: "byiringirourban20@gmail.com",
        phone: "+250 788 854 243",
        role: Role.ADMIN,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`✅ Admin Account Upserted:`);
    console.log(`   ID: ${admin.id} | Email: ${admin.email} | Phone: ${admin.phone} | Role: ${admin.role}`);

    // 2. Field Supervisor Account
    const supervisor = await prisma.user.upsert({
      where: { email: "urbanpac20@gmail.com" },
      update: {
        name: "Urban Pac",
        phone: "+250 788 668 243",
        role: Role.FIELD_SUPERVISOR,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: "u-urban-supervisor",
        name: "Urban Pac",
        email: "urbanpac20@gmail.com",
        phone: "+250 788 668 243",
        role: Role.FIELD_SUPERVISOR,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`✅ Field Supervisor Account Upserted:`);
    console.log(`   ID: ${supervisor.id} | Email: ${supervisor.email} | Phone: ${supervisor.phone} | Role: ${supervisor.role}`);

    console.log("--------------------------------------------------");
    console.log("🎉 User accounts successfully updated in Neon Database!");
    console.log("==================================================");
  } catch (error: any) {
    console.error("❌ Error upserting users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUrbanUsers();
