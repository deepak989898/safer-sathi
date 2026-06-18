import { routeCompletion } from "@/lib/ai/router";
import { generatePackageDraft } from "./package-generator";
import { generateVehicleDraft } from "./vehicle-generator";
import { generateHotelDraft } from "./hotel-generator";
import type { AIChatCommandResult } from "@/lib/ai-travel-manager/types";

export interface ChatCommandInput {
  message: string;
  createdBy: string;
  actorRole: string;
}

interface ParsedCommand {
  action: "package" | "vehicle" | "hotel" | "itinerary" | "unknown";
  destination?: string;
  category?: string;
  vehicleName?: string;
  hotelName?: string;
  days?: number;
}

function parseCommand(message: string): ParsedCommand {
  const m = message.toLowerCase();

  if (m.includes("innova") || m.includes("vehicle") || m.includes("crysta") || m.includes("tempo")) {
    const vehicleMatch = message.match(/innova crysta|ertiga|mercedes|tempo|bus|honda city/i);
    return {
      action: "vehicle",
      vehicleName: vehicleMatch?.[0] ?? "Toyota Innova Crysta",
    };
  }

  if (m.includes("hotel") || m.includes("resort") || m.includes("stay")) {
    const dest = extractDestination(message);
    return { action: "hotel", hotelName: undefined, destination: dest };
  }

  if (m.includes("itinerary") || m.includes("days")) {
    const daysMatch = message.match(/(\d+)\s*days?/i);
    return {
      action: "itinerary",
      destination: extractDestination(message),
      days: daysMatch ? Number(daysMatch[1]) : 6,
    };
  }

  if (m.includes("package") || m.includes("honeymoon") || m.includes("family") || m.includes("luxury")) {
    const dest = extractDestination(message);
    let category: string | undefined;
    if (m.includes("honeymoon")) category = "honeymoon";
    if (m.includes("luxury")) category = "domestic";
    if (m.includes("family")) category = "family";
    if (m.includes("rajasthan")) category = "domestic";
    return { action: "package", destination: dest, category };
  }

  return { action: "unknown", destination: extractDestination(message) };
}

function extractDestination(message: string): string {
  const destinations = [
    "Goa", "Kerala", "Rajasthan", "Kashmir", "Manali", "Jaipur",
    "Udaipur", "Shimla", "Darjeeling", "Andaman", "Ladakh",
  ];
  const lower = message.toLowerCase();
  for (const d of destinations) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  const match = message.match(/(?:for|to|in)\s+([A-Za-z\s]{3,20})/i);
  return match?.[1]?.trim() ?? "Goa";
}

export async function runAIChatCommand(
  input: ChatCommandInput
): Promise<AIChatCommandResult> {
  const parsed = parseCommand(input.message);

  if (parsed.action === "package" || parsed.action === "itinerary") {
    const draft = await generatePackageDraft({
      destination: parsed.destination ?? "Goa",
      category: parsed.category as never,
      durationDays: parsed.days ?? 6,
      customName: parsed.action === "itinerary"
        ? `${parsed.destination} ${parsed.days ?? 6} Day Itinerary`
        : undefined,
      createdBy: input.createdBy,
    });
    return {
      reply: `Created draft package "${draft.title.en}" for ${draft.cities[0]} at ₹${draft.price.toLocaleString("en-IN")}. Status: draft — awaiting manager review.`,
      action: "package_created",
      packageDraft: draft,
      provider: "rule-based",
    };
  }

  if (parsed.action === "vehicle") {
    const draft = await generateVehicleDraft({
      name: parsed.vehicleName,
      createdBy: input.createdBy,
    });
    return {
      reply: `Generated vehicle draft "${draft.name.en}" — ₹${draft.pricePerDay}/day, ₹${draft.pricePerKm}/km. Awaiting approval.`,
      action: "vehicle_created",
      vehicleDraft: draft,
      provider: "rule-based",
    };
  }

  if (parsed.action === "hotel") {
    const draft = await generateHotelDraft({
      city: parsed.destination,
      createdBy: input.createdBy,
    });
    return {
      reply: `Generated hotel draft "${draft.name.en}" in ${draft.city} from ₹${draft.priceFrom}/night. Awaiting approval.`,
      action: "hotel_created",
      hotelDraft: draft,
      provider: "rule-based",
    };
  }

  const { content, provider } = await routeCompletion(
    `You are Safar Sathi AI Travel Manager assistant for admin staff.
Help with package, hotel, and vehicle draft creation. Be concise.`,
    [{ role: "user", content: input.message }],
    async () =>
      `Try commands like: "Create Goa honeymoon package", "Generate Innova Crysta details", or "Create Kerala family package".`
  );

  return { reply: content, provider };
}
