import { sendOtpEmail } from "./config/mailer";
import { prisma } from "./config/prisma";
import bcrypt from "bcryptjs";

async function testOtpFlow() {
  console.log("==================================================");
  console.log("🧪 TESTING GMAIL SMTP OTP DELIVERY & RESET FLOW");
  console.log("==================================================");

  const testEmail = "urbanpac20@gmail.com";
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const testNewPassword = "NewPassword2026!";

  // Step 1: Send Email via Gmail SMTP
  console.log(`1. Sending OTP (${otpCode}) to ${testEmail} via Gmail SMTP...`);
  const emailResult = await sendOtpEmail(testEmail, otpCode, "Urban Pac");
  
  if (emailResult) {
    console.log(`✅ Gmail SMTP Email Sent Successfully!`);
  } else {
    console.log(`❌ Gmail SMTP Email Failed!`);
  }

  // Step 2: Store OTP in DB
  await prisma.passwordReset.deleteMany({ where: { email: testEmail } });
  await prisma.passwordReset.create({
    data: {
      email: testEmail,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  console.log(`2. OTP stored in Neon DB for ${testEmail}`);

  // Step 3: Verify OTP in DB
  const validRecord = await prisma.passwordReset.findFirst({
    where: {
      email: testEmail,
      otp: otpCode,
      expiresAt: { gt: new Date() },
    },
  });

  if (validRecord) {
    console.log(`✅ OTP Verification Successful! Record ID: ${validRecord.id}`);
  } else {
    console.log(`❌ OTP Verification Failed! Record not found.`);
  }

  // Step 4: Reset Password
  const hash = await bcrypt.hash(testNewPassword, 10);
  await prisma.user.updateMany({
    where: { email: testEmail },
    data: { passwordHash: hash },
  });
  console.log(`3. Password updated to "${testNewPassword}"`);

  // Step 5: Test login with new password
  const user = await prisma.user.findFirst({ where: { email: testEmail } });
  if (user && await bcrypt.compare(testNewPassword, user.passwordHash)) {
    console.log(`🎉 LOGIN TEST SUCCESSFUL with new password! User: ${user.name}`);
  } else {
    console.log(`❌ Login test failed.`);
  }

  // Step 6: Restore default password Password123!
  const defaultHash = await bcrypt.hash("Password123!", 10);
  await prisma.user.updateMany({
    where: { email: testEmail },
    data: { passwordHash: defaultHash },
  });
  console.log(`4. Restored default password "Password123!" for clean environment.`);

  console.log("==================================================");
  await prisma.$disconnect();
}

testOtpFlow();
