import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { runFraudAgent, type FraudCheckInput } from "@/lib/ai/agents/fraud-agent";
import { generateDynamicPricingSuggestions, defaultPriceRules } from "@/lib/ai-center/dynamic-pricing-agent";
import { mergeLeadSignals, scoreLead, type LeadTrackEvent } from "@/lib/ai-center/lead-scoring-agent";
import {
  analyzeReviewSentiment,
  buildReviewAiSummary,
  analyzeReviews,
} from "@/lib/ai-center/review-agent";
import { addAiCenterLog, getAiCenterSettings, hydrateAiCenterStore } from "@/lib/ai-center/repository";
import type {
  AiRatingRecord,
  BlockedUserRecord,
  FraudLogRecord,
  LeadScoreRecord,
  PriceRule,
  PricingHistoryRecord,
  Phase3Stats,
} from "@/lib/ai-center/types";
import { updateHotelInStore, getHotelByIdAdmin, hydrateHotelsStore } from "@/lib/hotel-store";
import { updatePackageInStore, getPackageByIdAdmin, hydratePackagesStore } from "@/lib/package-store";
import { updateVehicleInStore, getVehicleByIdAdmin, hydrateVehiclesStore } from "@/lib/vehicle-store";
import type { Review } from "@/types";

const COLLECTIONS = {
  pricingHistory: "pricing_history",
  priceRules: "price_rules",
  ratings: "ratings",
  reviews: "reviews",
  leadScores: "lead_scores",
  fraudLogs: "fraud_logs",
  blockedUsers: "blocked_users",
} as const;

let pricingCache: PricingHistoryRecord[] = [];
let rulesCache: PriceRule[] = [];
let ratingsCache: AiRatingRecord[] = [];
let leadsCache: LeadScoreRecord[] = [];
let fraudCache: FraudLogRecord[] = [];
let blockedCache: BlockedUserRecord[] = [];
let hydratePromise: Promise<void> | null = null;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function persist(collection: string, id: string, data: object): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).set(sanitize(data));
  } catch (error) {
    console.warn(`Firebase persist ${collection}/${id} failed:`, error);
  }
}

async function deleteDoc(collection: string, id: string): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).delete();
  } catch (error) {
    console.warn(`Firebase delete ${collection}/${id} failed:`, error);
  }
}

async function loadAll<T extends { id: string }>(collection: string, limit = 300): Promise<T[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection(collection).limit(limit).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  } catch {
    return [];
  }
}

export async function hydratePhase3Store(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const [pricing, rules, ratings, leads, fraud, blocked] = await Promise.all([
      loadAll<PricingHistoryRecord>(COLLECTIONS.pricingHistory),
      loadAll<PriceRule>(COLLECTIONS.priceRules),
      loadAll<AiRatingRecord>(COLLECTIONS.ratings),
      loadAll<LeadScoreRecord>(COLLECTIONS.leadScores),
      loadAll<FraudLogRecord>(COLLECTIONS.fraudLogs),
      loadAll<BlockedUserRecord>(COLLECTIONS.blockedUsers),
    ]);
    pricingCache = pricing.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    rulesCache = rules.length ? rules : defaultPriceRules();
    ratingsCache = ratings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    leadsCache = leads.sort(
      (a, b) => b.score - a.score || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    fraudCache = fraud.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    blockedCache = blocked.filter((b) => !b.unblockedAt);
  })();
  return hydratePromise;
}

function merge<T extends { id: string }>(cache: T[], item: T): T[] {
  const idx = cache.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const next = [...cache];
    next[idx] = item;
    return next;
  }
  return [item, ...cache];
}

// ─── Pricing ───────────────────────────────────────────────────────────────

export function listPricingHistory(status?: PricingHistoryRecord["status"]): PricingHistoryRecord[] {
  if (!status) return [...pricingCache];
  return pricingCache.filter((p) => p.status === status);
}

export function listPriceRules(): PriceRule[] {
  return [...rulesCache];
}

export async function updatePriceRule(id: string, updates: Partial<PriceRule>): Promise<PriceRule> {
  const existing = rulesCache.find((r) => r.id === id);
  const updated: PriceRule = {
    ...(existing ?? defaultPriceRules().find((r) => r.id === id)!),
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  rulesCache = merge(rulesCache, updated);
  await persist(COLLECTIONS.priceRules, id, updated);
  return updated;
}

export async function runDynamicPricingScan(): Promise<PricingHistoryRecord[]> {
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  if (!settings.dynamicPricingEnabled) return [];

  const drafts = await generateDynamicPricingSuggestions(rulesCache);
  const created: PricingHistoryRecord[] = [];

  for (const draft of drafts) {
    const exists = pricingCache.find(
      (p) =>
        p.entityId === draft.entityId &&
        p.status === "pending" &&
        p.suggestedPrice === draft.suggestedPrice
    );
    if (exists) continue;

    const record: PricingHistoryRecord = {
      ...draft,
      id: `price_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    pricingCache = merge(pricingCache, record);
    await persist(COLLECTIONS.pricingHistory, record.id, record);
    created.push(record);
  }

  if (created.length) {
    await addAiCenterLog({
      type: "pricing_suggested",
      message: `Generated ${created.length} dynamic pricing suggestions`,
      resourceType: "pricing",
    });
  }
  return created;
}

async function applyApprovedPrice(record: PricingHistoryRecord, price: number): Promise<void> {
  await Promise.all([hydratePackagesStore(), hydrateHotelsStore(), hydrateVehiclesStore()]);
  if (record.entityType === "package") {
    const pkg = getPackageByIdAdmin(record.entityId);
    if (pkg) await updatePackageInStore(record.entityId, { price });
  } else if (record.entityType === "hotel") {
    const hotel = getHotelByIdAdmin(record.entityId);
    if (hotel) await updateHotelInStore(record.entityId, { priceFrom: price });
  } else if (record.entityType === "vehicle") {
    const vehicle = getVehicleByIdAdmin(record.entityId);
    if (vehicle) await updateVehicleInStore(record.entityId, { pricePerDay: price });
  }
}

export async function approvePricingSuggestion(
  id: string,
  approvedBy: string,
  overridePrice?: number
): Promise<PricingHistoryRecord> {
  const record = pricingCache.find((p) => p.id === id);
  if (!record) throw new Error("Pricing suggestion not found");

  const price = overridePrice ?? record.suggestedPrice;
  const updated: PricingHistoryRecord = {
    ...record,
    status: "approved",
    approvedPrice: price,
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
  pricingCache = merge(pricingCache, updated);
  await persist(COLLECTIONS.pricingHistory, id, updated);
  await applyApprovedPrice(updated, price);
  await addAiCenterLog({
    type: "pricing_approved",
    message: `Approved price ₹${price.toLocaleString("en-IN")} for ${record.entityName}`,
    resourceId: id,
    resourceType: "pricing",
  });
  return updated;
}

export async function rejectPricingSuggestion(
  id: string,
  reason?: string
): Promise<PricingHistoryRecord> {
  const record = pricingCache.find((p) => p.id === id);
  if (!record) throw new Error("Pricing suggestion not found");
  const updated = { ...record, status: "rejected" as PricingHistoryRecord["status"], rejectedReason: reason };
  pricingCache = merge(pricingCache, updated);
  await persist(COLLECTIONS.pricingHistory, id, updated);
  await addAiCenterLog({
    type: "pricing_rejected",
    message: reason ?? `Rejected pricing for ${record.entityName}`,
    resourceId: id,
    resourceType: "pricing",
  });
  return updated;
}

// ─── Reviews / Ratings ─────────────────────────────────────────────────────

export function listRatings(status?: AiRatingRecord["status"]): AiRatingRecord[] {
  if (!status) return [...ratingsCache];
  return ratingsCache.filter((r) => r.status === status);
}

export function getReviewAnalysis() {
  return analyzeReviews(ratingsCache);
}

export async function submitTripReview(input: {
  userId: string;
  userName: string;
  bookingId?: string;
  serviceType: string;
  serviceId: string;
  serviceName: string;
  destination?: string;
  hotelName?: string;
  vehicleName?: string;
  rating: number;
  review: string;
  photos?: string[];
  suggestions?: string;
  complaints?: string;
}): Promise<AiRatingRecord> {
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  const sentiment = analyzeReviewSentiment(input.review);
  const record: AiRatingRecord = {
    ...input,
    id: `rating_${Date.now()}`,
    photos: input.photos ?? [],
    sentiment,
    status: settings.reviewApprovalRequired ? "pending" : "approved",
    aiSummary: "",
    createdAt: new Date().toISOString(),
  };
  record.aiSummary = buildReviewAiSummary(record);

  ratingsCache = merge(ratingsCache, record);
  await persist(COLLECTIONS.ratings, record.id, record);

  if (record.status === "approved") {
    await syncRatingToPublicReview(record);
  }

  await addAiCenterLog({
    type: "review_submitted",
    message: `Review submitted: ${record.rating}★ for ${record.serviceName}`,
    resourceId: record.id,
    resourceType: "review",
  });
  return record;
}

async function syncRatingToPublicReview(record: AiRatingRecord): Promise<void> {
  const review: Review = {
    id: record.id,
    userId: record.userId,
    userName: record.userName,
    serviceType: record.serviceType as Review["serviceType"],
    serviceId: record.serviceId,
    rating: record.rating,
    comment: { en: record.review, hi: record.review },
    createdAt: record.createdAt,
  };
  await persist(COLLECTIONS.reviews, review.id, review);
}

export async function approveRating(id: string, approvedBy: string): Promise<AiRatingRecord> {
  const record = ratingsCache.find((r) => r.id === id);
  if (!record) throw new Error("Review not found");
  const updated: AiRatingRecord = {
    ...record,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
  ratingsCache = merge(ratingsCache, updated);
  await persist(COLLECTIONS.ratings, id, updated);
  await syncRatingToPublicReview(updated);
  await addAiCenterLog({
    type: "review_approved",
    message: `Approved review from ${record.userName}`,
    resourceId: id,
    resourceType: "review",
  });
  return updated;
}

export async function hideRating(id: string): Promise<AiRatingRecord> {
  const record = ratingsCache.find((r) => r.id === id);
  if (!record) throw new Error("Review not found");
  const updated = { ...record, status: "hidden" as const };
  ratingsCache = merge(ratingsCache, updated);
  await persist(COLLECTIONS.ratings, id, updated);
  await deleteDoc(COLLECTIONS.reviews, id);
  await addAiCenterLog({
    type: "review_hidden",
    message: `Hidden review from ${record.userName}`,
    resourceId: id,
    resourceType: "review",
  });
  return updated;
}

export async function replyToRating(id: string, adminReply: string): Promise<AiRatingRecord> {
  const record = ratingsCache.find((r) => r.id === id);
  if (!record) throw new Error("Review not found");
  const updated = { ...record, adminReply };
  ratingsCache = merge(ratingsCache, updated);
  await persist(COLLECTIONS.ratings, id, updated);
  return updated;
}

export async function deleteRating(id: string): Promise<void> {
  ratingsCache = ratingsCache.filter((r) => r.id !== id);
  await deleteDoc(COLLECTIONS.ratings, id);
  await deleteDoc(COLLECTIONS.reviews, id);
}

// ─── Lead Scoring ──────────────────────────────────────────────────────────

export function listLeadScores(status?: LeadScoreRecord["status"]): LeadScoreRecord[] {
  if (!status) return [...leadsCache];
  return leadsCache.filter((l) => l.status === status);
}

export async function trackLeadEvent(event: LeadTrackEvent): Promise<LeadScoreRecord | null> {
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  if (!settings.leadScoringEnabled) return null;

  const existing =
    leadsCache.find((l) => l.sessionId === event.sessionId) ??
    leadsCache.find((l) => event.userId && l.userId === event.userId);

  const baseSignals = existing?.signals ?? {
    destinationSearches: 0,
    hotelViews: 0,
    vehicleViews: 0,
    repeatedVisits: 0,
    timeOnSiteMinutes: 0,
    bookingAttempts: 0,
  };

  const signals = mergeLeadSignals(baseSignals, event);
  const { score, status, aiSuggestion } = scoreLead(signals);
  const now = new Date().toISOString();

  const record: LeadScoreRecord = {
    id: existing?.id ?? `lead_${Date.now()}`,
    userId: event.userId ?? existing?.userId,
    sessionId: event.sessionId,
    email: event.email ?? existing?.email,
    phone: event.phone ?? existing?.phone,
    name: event.name ?? existing?.name,
    score,
    status,
    signals,
    aiSuggestion,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  leadsCache = merge(leadsCache, record);
  await persist(COLLECTIONS.leadScores, record.id, record);
  await addAiCenterLog({
    type: "lead_scored",
    message: `Lead score ${score} (${status}) — ${event.type}`,
    resourceId: record.id,
    resourceType: "lead",
  });
  return record;
}

// ─── Fraud ─────────────────────────────────────────────────────────────────

export function listFraudLogs(status?: FraudLogRecord["status"]): FraudLogRecord[] {
  if (!status) return [...fraudCache];
  return fraudCache.filter((f) => f.status === status);
}

export function listBlockedUsers(): BlockedUserRecord[] {
  return [...blockedCache];
}

export function isUserBlocked(email?: string, phone?: string, userId?: string): boolean {
  return blockedCache.some(
    (b) =>
      (email && b.email === email) ||
      (phone && b.phone === phone) ||
      (userId && b.userId === userId)
  );
}

export async function runFraudCheckAndLog(
  input: FraudCheckInput & { userId?: string; bookingId?: string },
  actorId?: string
): Promise<FraudLogRecord> {
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  const result = await runFraudAgent(input);

  let actionTaken: FraudLogRecord["actionTaken"] = "none";
  let status: FraudLogRecord["status"] = "open";

  if (settings.fraudDetectionEnabled) {
    if (result.riskScore >= settings.fraudRiskThreshold + 25) {
      actionTaken = "block";
      status = "blocked";
    } else if (result.riskScore >= settings.fraudRiskThreshold) {
      actionTaken = "hold";
    } else if (result.riskLevel === "medium") {
      actionTaken = "verify";
    }
  }

  const log: FraudLogRecord = {
    id: `fraud_${Date.now()}`,
    userId: input.userId,
    email: input.customerEmail,
    phone: input.customerPhone,
    bookingId: input.bookingId,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    signals: result.signals,
    recommendedAction: result.recommendation,
    actionTaken,
    status,
    createdAt: new Date().toISOString(),
  };

  fraudCache = merge(fraudCache, log);
  await persist(COLLECTIONS.fraudLogs, log.id, log);
  await addAiCenterLog({
    type: "fraud_detected",
    message: `Fraud alert: ${result.riskLevel} risk (${result.riskScore}) — ${input.customerEmail}`,
    resourceId: log.id,
    resourceType: "fraud",
  });

  if (actionTaken === "block" && actorId) {
    await blockUser({
      email: input.customerEmail,
      phone: input.customerPhone,
      userId: input.userId,
      reason: result.recommendation,
      fraudLogId: log.id,
      permanent: result.riskLevel === "critical",
      blockedBy: actorId,
    });
  }

  return log;
}

export async function blockUser(input: {
  userId?: string;
  email?: string;
  phone?: string;
  reason: string;
  fraudLogId?: string;
  permanent: boolean;
  blockedBy: string;
}): Promise<BlockedUserRecord> {
  const record: BlockedUserRecord = {
    id: `blocked_${Date.now()}`,
    ...input,
    blockedAt: new Date().toISOString(),
  };
  blockedCache = merge(blockedCache, record);
  await persist(COLLECTIONS.blockedUsers, record.id, record);
  await addAiCenterLog({
    type: "user_blocked",
    message: `Blocked user ${input.email ?? input.phone ?? input.userId}`,
    resourceId: record.id,
    resourceType: "blocked_user",
  });
  return record;
}

export async function unblockUser(id: string, resolvedBy: string): Promise<BlockedUserRecord> {
  const record = blockedCache.find((b) => b.id === id);
  if (!record) throw new Error("Blocked user not found");
  const updated = { ...record, unblockedAt: new Date().toISOString() };
  blockedCache = blockedCache.filter((b) => b.id !== id);
  await persist(COLLECTIONS.blockedUsers, id, updated);
  await addAiCenterLog({
    type: "user_unblocked",
    message: `Unblocked ${record.email ?? record.phone}`,
    resourceId: id,
    resourceType: "blocked_user",
  });

  const fraudLog = fraudCache.find((f) => f.id === record.fraudLogId);
  if (fraudLog) {
    const resolved = {
      ...fraudLog,
      status: "resolved" as const,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    fraudCache = merge(fraudCache, resolved);
    await persist(COLLECTIONS.fraudLogs, fraudLog.id, resolved);
  }
  return updated;
}

export async function resolveFraudLog(id: string, resolvedBy: string): Promise<FraudLogRecord> {
  const log = fraudCache.find((f) => f.id === id);
  if (!log) throw new Error("Fraud log not found");
  const updated = {
    ...log,
    status: "resolved" as const,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  };
  fraudCache = merge(fraudCache, updated);
  await persist(COLLECTIONS.fraudLogs, id, updated);
  await addAiCenterLog({
    type: "fraud_resolved",
    message: `Resolved fraud alert ${id}`,
    resourceId: id,
    resourceType: "fraud",
  });
  return updated;
}

export async function getPublicReviews(): Promise<Review[]> {
  await hydratePhase3Store();
  const fromRatings = ratingsCache
    .filter((r) => r.status === "approved")
    .map(
      (r): Review => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        serviceType: r.serviceType as Review["serviceType"],
        serviceId: r.serviceId,
        rating: r.rating,
        comment: { en: r.review, hi: r.review },
        createdAt: r.createdAt,
      })
    );

  if (fromRatings.length) return fromRatings;

  const fromReviews = await loadAll<Review>(COLLECTIONS.reviews, 100);
  return fromReviews;
}

export function getPhase3Stats(): Phase3Stats {
  return {
    pricingPending: pricingCache.filter((p) => p.status === "pending").length,
    pricingApproved: pricingCache.filter((p) => p.status === "approved").length,
    reviewsPending: ratingsCache.filter((r) => r.status === "pending").length,
    reviewsApproved: ratingsCache.filter((r) => r.status === "approved").length,
    hotLeads: leadsCache.filter((l) => l.status === "hot").length,
    warmLeads: leadsCache.filter((l) => l.status === "warm").length,
    coldLeads: leadsCache.filter((l) => l.status === "cold").length,
    fraudOpen: fraudCache.filter((f) => f.status === "open" || f.status === "blocked").length,
    fraudHigh: fraudCache.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical").length,
    blockedUsers: blockedCache.length,
  };
}
