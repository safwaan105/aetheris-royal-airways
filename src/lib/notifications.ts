import nodemailer from "nodemailer";
import twilio from "twilio";

interface NotifyPayload {
  toEmail: string;
  toPhone?: string;
  subject: string;
  text: string;
}

export async function sendBookingNotifications(payload: NotifyPayload) {
  const result: { email: "sent" | "skipped" | "failed"; sms: "sent" | "skipped" | "failed" } = {
    email: "skipped",
    sms: "skipped",
  };

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NOTIFICATION_FROM_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.NOTIFICATION_FROM_EMAIL,
        to: payload.toEmail,
        subject: payload.subject,
        text: payload.text,
      });
      result.email = "sent";
    } catch {
      result.email = "failed";
    }
  }

  if (
    payload.toPhone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        to: payload.toPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: payload.text,
      });
      result.sms = "sent";
    } catch {
      result.sms = "failed";
    }
  }

  return result;
}
