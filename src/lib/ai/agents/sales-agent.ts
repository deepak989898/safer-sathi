import { appUrl } from "@/lib/site-config";
import { listAllUsers } from "@/lib/auth/auth-service";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Sales Agent. Generate personalized lead follow-up messages
for travel prospects. Include urgency, value proposition, and clear call-to-action.
Support English and Hindi. Keep messages under 200 words.`;

export interface SalesAgentInput {
  leadName: string;
  leadEmail?: string;
  interest?: string;
  abandonedPackage?: string;
  locale?: "en" | "hi";
  segment?: "vip" | "regular" | "new" | "at_risk";
}

export interface SalesFollowUp {
  subject: string;
  message: string;
  channel: "email" | "whatsapp";
  priority: "low" | "medium" | "high";
}

export interface SalesAgentResult {
  followUps: SalesFollowUp[];
  provider: AIProvider;
}

function ruleBasedFollowUps(input: SalesAgentInput): SalesFollowUp[] {
  const isHi = input.locale === "hi";
  const packageName = input.abandonedPackage ?? "Golden Triangle Tour";
  const isVip = input.segment === "vip";

  const packagesLink = appUrl("/packages");

  const emailMessage = isHi
    ? `प्रिय ${input.leadName},\n\nआपने ${packageName} में रुचि दिखाई थी। Safar Sathi पर विशेष 10% छूट — केवल 48 घंटे के लिए! अभी बुक करें: ${packagesLink}\n\nधन्यवाद,\nSafar Sathi Sales`
    : `Hi ${input.leadName},\n\nYou showed interest in ${packageName}. Exclusive 10% off at Safar Sathi — valid for 48 hours only! Book now: ${packagesLink}\n\nBest regards,\nSafar Sathi Sales`;

  const whatsappMessage = isHi
    ? `नमस्ते ${input.leadName}! 🌴 ${packageName} आपका इंतज़ार कर रहा है। आज बुक करें और 10% बचाएं। Reply YES for callback.`
    : `Hi ${input.leadName}! 🌴 ${packageName} is waiting for you. Book today and save 10%. Reply YES for a callback.`;

  return [
    {
      subject: isHi ? `${packageName} — विशेष ऑफर` : `${packageName} — Special Offer`,
      message: emailMessage,
      channel: "email",
      priority: isVip ? "high" : "medium",
    },
    {
      subject: "WhatsApp Follow-up",
      message: whatsappMessage,
      channel: "whatsapp",
      priority: input.segment === "at_risk" ? "high" : "medium",
    },
  ];
}

export async function runSalesAgent(input: SalesAgentInput): Promise<SalesAgentResult> {
  const users = await listAllUsers();
  const existingUser = users.find(
    (u) => u.email === input.leadEmail || u.name === input.leadName
  );

  const enrichedInput = {
    ...input,
    segment: input.segment ?? existingUser?.segment ?? "new",
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: JSON.stringify(enrichedInput),
    },
  ];

  await routeCompletion(SYSTEM_PROMPT, messages, () =>
    JSON.stringify(ruleBasedFollowUps(enrichedInput))
  );

  const followUps = ruleBasedFollowUps(enrichedInput);

  return {
    followUps,
    provider: "rule-based",
  };
}
