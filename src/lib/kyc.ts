interface PassengerForKyc {
  fullName: string;
  passportNumber: string;
  dateOfBirth: string;
  nationality: string;
  passportCountry: string;
  passportExpiry: string;
}

export interface KycResult {
  status: "passed" | "failed" | "manual_review";
  reason?: string;
  referenceId?: string;
}

function yearsBetween(date: Date, now: Date) {
  let years = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    years -= 1;
  }
  return years;
}

export async function runKycCheck(passenger: PassengerForKyc): Promise<KycResult> {
  const dob = new Date(passenger.dateOfBirth);
  const expiry = new Date(passenger.passportExpiry);
  const now = new Date();

  if (Number.isNaN(dob.getTime()) || Number.isNaN(expiry.getTime())) {
    return { status: "failed", reason: "Invalid date fields in KYC payload." };
  }

  const age = yearsBetween(dob, now);
  if (age < 18) {
    return { status: "failed", reason: "Passenger must be at least 18 years old for this booking." };
  }

  const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
  if (expiry.getTime() - now.getTime() < sixMonthsMs) {
    return { status: "failed", reason: "Passport expiry must be at least 6 months from today." };
  }

  const vendorUrl = process.env.KYC_API_URL;
  if (!vendorUrl) {
    return { status: "passed", referenceId: `LOCAL-${Date.now()}` };
  }

  try {
    const response = await fetch(vendorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.KYC_API_KEY ? { Authorization: `Bearer ${process.env.KYC_API_KEY}` } : {}),
      },
      body: JSON.stringify(passenger),
    });

    if (!response.ok) {
      return { status: "manual_review", reason: "KYC provider unavailable." };
    }

    const result = (await response.json()) as { status?: string; reason?: string; referenceId?: string };
    if (result.status === "passed" || result.status === "failed" || result.status === "manual_review") {
      return {
        status: result.status,
        reason: result.reason,
        referenceId: result.referenceId,
      };
    }

    return { status: "manual_review", reason: "KYC provider returned unknown status." };
  } catch {
    return { status: "manual_review", reason: "KYC provider request failed." };
  }
}
