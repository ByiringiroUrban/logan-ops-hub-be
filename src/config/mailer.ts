import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER || "urbanpac20@gmail.com";
const smtpPass = (process.env.SMTP_PASS || "pnwsefvakvtsuajw").replace(/\s+/g, "");
const smtpFrom = process.env.SMTP_FROM || `Logan Investment Co. Ltd <${smtpUser}>`;

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendOtpEmail(toEmail: string, otpCode: string, recipientName: string = "Valued User"): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background-color: #0284c7; padding: 25px 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 35px 30px; text-align: center; }
        .greeting { font-size: 16px; margin-bottom: 15px; text-align: left; color: #1e293b; }
        .instruction { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px; text-align: left; }
        .otp-box { display: inline-block; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 10px; padding: 18px 36px; margin: 10px 0 25px 0; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0369a1; font-family: monospace; }
        .expiry { font-size: 13px; color: #64748b; margin-top: 10px; }
        .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Logan Investment Co. Ltd</h1>
          <p>Management & Reporting System</p>
        </div>
        <div class="content">
          <div class="greeting">Hello <strong>${recipientName}</strong>,</div>
          <div class="instruction">
            We received a request to reset the password for your account. Use the 6-digit Verification Code below to complete your password reset:
          </div>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <div class="expiry">
            ⏱️ This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Logan Investment Co. Ltd. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `🔑 ${otpCode} is your Password Reset Verification Code - Logan Investment`,
      html: htmlContent,
    });
    console.log(`[SMTP LOG] 📧 OTP email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[SMTP LOG] ❌ Failed to send OTP email to ${toEmail}:`, error);
    return false;
  }
}
