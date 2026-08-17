import dotenv from "dotenv";
dotenv.config();
import { prisma } from "./config/prisma";

async function verifyNeonConnection() {
  console.log("==================================================");
  console.log("🔍 TESTING NEON POSTGRESQL DATABASE CONNECTION");
  console.log("==================================================");

  try {
    const rawResult: Array<{ version: string; current_database: string }> =
      await prisma.$queryRaw`SELECT version(), current_database()`;

    console.log("✅ Neon PostgreSQL Server Version & Database:");
    console.log(`   Database Name: ${rawResult[0]?.current_database}`);
    console.log(`   Server Engine: ${rawResult[0]?.version}`);
    console.log("--------------------------------------------------");

    const userCount = await prisma.user.count();
    const clientCount = await prisma.client.count();
    const productCount = await prisma.product.count();
    const transactionCount = await prisma.transaction.count();
    const expenseCount = await prisma.expense.count();
    const documentCount = await prisma.companyDocument.count();

    console.log("📊 Database Record Counts in Neon:");
    console.log(`   • Users:         ${userCount}`);
    console.log(`   • Clients:       ${clientCount}`);
    console.log(`   • Products:      ${productCount}`);
    console.log(`   • Transactions:  ${transactionCount}`);
    console.log(`   • Expenses:      ${expenseCount}`);
    console.log(`   • Documents:     ${documentCount}`);
    console.log("--------------------------------------------------");

    const sampleUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true },
      take: 3,
    });
    console.log("👥 Sample Seeding Users in Neon:");
    console.table(sampleUsers);

    console.log("==================================================");
    console.log("🎉 VERIFICATION RESULT: Neon DB is WELL CONNECTED and Fully Operational!");
    console.log("==================================================");
  } catch (error: any) {
    console.error("❌ Connection failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyNeonConnection();
