import bcrypt from "bcryptjs";
import { prisma } from "./config/prisma";

async function testAuthLogin() {
  console.log("==================================================");
  console.log("🧪 TESTING DUAL EMAIL / PHONE LOGIN LOGIC");
  console.log("==================================================");

  const testCases = [
    { label: "Admin by Email", input: "byiringirourban20@gmail.com", expectedRole: "ADMIN" },
    { label: "Admin by Phone (0788854243)", input: "0788854243", expectedRole: "ADMIN" },
    { label: "Admin by Formatted Phone (+250 788 854 243)", input: "+250 788 854 243", expectedRole: "ADMIN" },
    { label: "Field Supervisor by Email", input: "urbanpac20@gmail.com", expectedRole: "FIELD_SUPERVISOR" },
    { label: "Field Supervisor by Phone (0788668243)", input: "0788668243", expectedRole: "FIELD_SUPERVISOR" },
    { label: "Field Supervisor by Formatted Phone (+250788668243)", input: "+250788668243", expectedRole: "FIELD_SUPERVISOR" },
  ];

  const password = "Password123!";

  for (const tc of testCases) {
    const identifier = tc.input.trim();
    const cleanDigits = identifier.replace(/\D/g, "");
    const phoneVariations: string[] = [identifier];
    if (cleanDigits.length >= 8) {
      const localNum = cleanDigits.slice(-9);
      phoneVariations.push(
        `0${localNum}`,
        `+250${localNum}`,
        `+250 ${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`,
        `0${localNum.slice(0, 3)} ${localNum.slice(3, 6)} ${localNum.slice(6)}`
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneVariations } },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-8) } }] : []),
        ],
      },
    });

    if (!user) {
      console.log(`❌ FAIL [${tc.label}]: User not found for identifier "${identifier}"`);
      continue;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      console.log(`❌ FAIL [${tc.label}]: Password mismatch for user "${user.name}"`);
      continue;
    }

    if (user.role !== tc.expectedRole) {
      console.log(`❌ FAIL [${tc.label}]: Unexpected role "${user.role}"`);
      continue;
    }

    console.log(`✅ PASS [${tc.label}]: Identified "${user.name}" (${user.email} / ${user.phone}) -> Role: ${user.role}`);
  }

  console.log("==================================================");
  await prisma.$disconnect();
}

testAuthLogin();
