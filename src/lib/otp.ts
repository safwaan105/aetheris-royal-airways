import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendBookingNotifications } from "@/lib/notifications";

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function createLoginOtpChallenge(input: {
  userId: string;
  email: string;
  purpose?: "login";
}) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const challenge = await prisma.otpChallenge.create({
    data: {
      userId: input.userId,
      purpose: input.purpose || "login",
      codeHash: hashCode(code),
      email: input.email.toLowerCase(),
      expiresAt,
    },
  });

  const notifyResult = await sendBookingNotifications({
    toEmail: input.email,
    subject: "Your Aetheris OTP Code",
    text: `Your OTP code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });
  if (notifyResult.email !== "sent") {
    throw new Error("OTP email delivery failed. Configure SMTP settings.");
  }

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
  };
}

export async function verifyLoginOtpChallenge(input: {
  challengeId: string;
  code: string;
}) {
  const challenge = await prisma.otpChallenge.findUnique({
    where: { id: input.challengeId },
  });

  if (!challenge) {
    throw new Error("OTP challenge not found.");
  }
  if (challenge.verifiedAt) {
    throw new Error("OTP already used.");
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("OTP attempts exceeded.");
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error("OTP expired.");
  }

  const valid = hashCode(input.code) === challenge.codeHash;
  if (!valid) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid OTP code.");
  }

  const updated = await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { verifiedAt: new Date() },
  });

  return updated;
}
