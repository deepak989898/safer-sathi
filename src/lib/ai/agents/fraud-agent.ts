import { getBookings } from "@/lib/data-service";
import { listAllUsers } from "@/lib/auth/auth-service";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Fraud Detection Agent. Score transactions and bookings
for fraud risk. Consider amount anomalies, velocity, customer history, and payment patterns.`;

export interface FraudCheckInput {
  customerEmail: string;
  customerPhone: string;
  amount: number;
  serviceType: string;
  paymentMethod?: string;
  ipAddress?: string;
  bookingCount24h?: number;
}

export interface FraudSignal {
  signal: string;
  severity: "low" | "medium" | "high";
  score: number;
}

export interface FraudAgentResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  recommendation: string;
  provider: AIProvider;
  approved: boolean;
}

async function ruleBasedFraudCheck(
  input: FraudCheckInput
): Promise<Omit<FraudAgentResult, "provider">> {
  const signals: FraudSignal[] = [];
  let riskScore = 0;

  const users = await listAllUsers();
  const user = users.find(
    (u) => u.email === input.customerEmail || u.phone === input.customerPhone
  );

  if (!user) {
    signals.push({ signal: "New customer — no booking history", severity: "low", score: 10 });
    riskScore += 10;
  } else if (user.segment === "vip") {
    signals.push({ signal: "Verified VIP customer", severity: "low", score: -15 });
    riskScore = Math.max(0, riskScore - 15);
  }

  if (input.amount > 500000) {
    signals.push({ signal: "High transaction amount (>₹5L)", severity: "high", score: 35 });
    riskScore += 35;
  } else if (input.amount > 100000) {
    signals.push({ signal: "Elevated transaction amount (>₹1L)", severity: "medium", score: 15 });
    riskScore += 15;
  }

  const bookings = await getBookings();
  const recentFromEmail = bookings.filter((b) => b.customerEmail === input.customerEmail).length;
  if (recentFromEmail > 5) {
    signals.push({ signal: "High booking frequency from email", severity: "medium", score: 20 });
    riskScore += 20;
  }

  if (input.bookingCount24h && input.bookingCount24h > 3) {
    signals.push({ signal: "Velocity check: >3 bookings in 24h", severity: "high", score: 40 });
    riskScore += 40;
  }

  const disposableDomains = ["tempmail", "guerrillamail", "mailinator", "yopmail"];
  if (disposableDomains.some((d) => input.customerEmail.toLowerCase().includes(d))) {
    signals.push({ signal: "Disposable email domain detected", severity: "high", score: 45 });
    riskScore += 45;
  }

  if (input.paymentMethod === "card" && input.amount > 200000) {
    signals.push({ signal: "Large card payment — verify 3DS", severity: "medium", score: 10 });
    riskScore += 10;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel: FraudAgentResult["riskLevel"] = "low";
  if (riskScore >= 75) riskLevel = "critical";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 25) riskLevel = "medium";

  const approved = riskLevel === "low" || riskLevel === "medium";

  const recommendation =
    riskLevel === "critical"
      ? "Block transaction and escalate to fraud team immediately."
      : riskLevel === "high"
        ? "Require manual review and additional identity verification before processing."
        : riskLevel === "medium"
          ? "Proceed with standard verification (OTP + payment gateway checks)."
          : "Low risk — approve with standard processing.";

  return { riskScore, riskLevel, signals, recommendation, approved };
}

export async function runFraudAgent(input: FraudCheckInput): Promise<FraudAgentResult> {
  const fallback = await ruleBasedFraudCheck(input);

  const messages: ChatMessage[] = [
    { role: "user", content: JSON.stringify(input) },
  ];

  await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    () => JSON.stringify(fallback)
  );

  return { ...fallback, provider: "rule-based" };
}
