import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import {
  MAX_REDEEM_PERCENT,
  MIN_EARN_POINTS,
  MIN_REDEEM_POINTS,
  POINT_VALUE_INR,
  REWARD_POINTS_PER_RUPEE,
  REWARD_TX_COLLECTION,
} from "@/lib/rewards/constants";
import type { Booking, RewardTransaction, User } from "@/types";

export function calculateEarnedPoints(paidAmount: number): number {
  const raw = Math.floor(paidAmount * REWARD_POINTS_PER_RUPEE);
  return Math.max(MIN_EARN_POINTS, raw);
}

export function calculateRewardDiscount(points: number): number {
  return Math.max(0, Math.floor(points) * POINT_VALUE_INR);
}

export function calculateMaxRedeemablePoints(
  availablePoints: number,
  bookingAmount: number
): number {
  const maxByPercent = Math.floor(bookingAmount * MAX_REDEEM_PERCENT);
  const maxByBalance = Math.floor(availablePoints);
  return Math.max(0, Math.min(maxByBalance, maxByPercent));
}

export function normalizeRedeemPoints(
  requested: number,
  availablePoints: number,
  bookingAmount: number
): number {
  const max = calculateMaxRedeemablePoints(availablePoints, bookingAmount);
  const normalized = Math.floor(requested);
  if (normalized < MIN_REDEEM_POINTS) return 0;
  return Math.min(normalized, max);
}

async function getUserRewardDoc(userId: string): Promise<{
  rewardPoints: number;
  lifetimeRewardPoints: number;
} | null> {
  const db = await getSafeAdminDb();
  if (!db) return null;

  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) return { rewardPoints: 0, lifetimeRewardPoints: 0 };

  const data = snap.data() as User;
  return {
    rewardPoints: Number(data.rewardPoints ?? 0),
    lifetimeRewardPoints: Number(data.lifetimeRewardPoints ?? 0),
  };
}

async function writeRewardTransaction(tx: Omit<RewardTransaction, "id">): Promise<void> {
  const db = await getSafeAdminDb();
  if (!db) return;

  const id = `rw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.collection(REWARD_TX_COLLECTION).doc(id).set({
    id,
    ...tx,
  });
}

export async function getCustomerRewards(userId: string): Promise<{
  rewardPoints: number;
  lifetimeRewardPoints: number;
  transactions: RewardTransaction[];
}> {
  const db = await getSafeAdminDb();
  const balance = (await getUserRewardDoc(userId)) ?? {
    rewardPoints: 0,
    lifetimeRewardPoints: 0,
  };

  if (!db) {
    return { ...balance, transactions: [] };
  }

  try {
    const snap = await db
      .collection(REWARD_TX_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const transactions = snap.docs.map((doc) => doc.data() as RewardTransaction);
    return { ...balance, transactions };
  } catch {
    const snap = await db
      .collection(REWARD_TX_COLLECTION)
      .where("userId", "==", userId)
      .limit(30)
      .get();
    const transactions = snap.docs
      .map((doc) => doc.data() as RewardTransaction)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ...balance, transactions };
  }
}

/** Reserve points when booking is created (deducted from balance). */
export async function reserveRewardPoints(input: {
  userId: string;
  points: number;
  bookingId: string;
  bookingNumber: string;
}): Promise<{ ok: true; discount: number } | { ok: false; error: string }> {
  if (input.points <= 0) {
    return { ok: true, discount: 0 };
  }

  const db = await getSafeAdminDb();
  if (!db) {
    return { ok: false, error: "Rewards service unavailable." };
  }

  const userRef = db.collection("users").doc(input.userId);
  const now = new Date().toISOString();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const current = Number(userSnap.data()?.rewardPoints ?? 0);

      if (current < input.points) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      const next = current - input.points;
      transaction.set(
        userRef,
        { rewardPoints: next, updatedAt: now },
        { merge: true }
      );

      const txId = `rw_${Date.now()}_redeem`;
      transaction.set(db.collection(REWARD_TX_COLLECTION).doc(txId), {
        id: txId,
        userId: input.userId,
        type: "redeem",
        points: -input.points,
        balanceAfter: next,
        bookingId: input.bookingId,
        bookingNumber: input.bookingNumber,
        note: `Redeemed on booking ${input.bookingNumber}`,
        createdAt: now,
      });

      return next;
    });

    void result;
    return { ok: true, discount: calculateRewardDiscount(input.points) };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_POINTS") {
      return { ok: false, error: "Not enough reward points." };
    }
    console.error("reserveRewardPoints failed:", error);
    return { ok: false, error: "Could not apply reward points." };
  }
}

/** Refund reserved points when payment fails or booking is cancelled before pay. */
export async function refundReservedRewardPoints(input: {
  userId: string;
  points: number;
  bookingId: string;
  bookingNumber: string;
}): Promise<void> {
  if (input.points <= 0) return;

  const db = await getSafeAdminDb();
  if (!db) return;

  const userRef = db.collection("users").doc(input.userId);
  const now = new Date().toISOString();

  try {
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const current = Number(userSnap.data()?.rewardPoints ?? 0);
      const next = current + input.points;

      transaction.set(
        userRef,
        { rewardPoints: next, updatedAt: now },
        { merge: true }
      );

      const txId = `rw_${Date.now()}_refund`;
      transaction.set(db.collection(REWARD_TX_COLLECTION).doc(txId), {
        id: txId,
        userId: input.userId,
        type: "refund",
        points: input.points,
        balanceAfter: next,
        bookingId: input.bookingId,
        bookingNumber: input.bookingNumber,
        note: `Refunded — payment not completed (${input.bookingNumber})`,
        createdAt: now,
      });
    });
  } catch (error) {
    console.error("refundReservedRewardPoints failed:", error);
  }
}

/** Award points after confirmed payment (idempotent per booking). */
export async function awardBookingRewardPoints(booking: Booking): Promise<number> {
  if (booking.rewardPointsEarned && booking.rewardPointsEarned > 0) {
    return booking.rewardPointsEarned;
  }

  const userId = booking.userId;
  if (!userId || userId === "guest") return 0;

  const paid = booking.paidAmount ?? 0;
  if (paid <= 0 || booking.status !== "confirmed") return 0;

  const points = calculateEarnedPoints(paid);
  const db = await getSafeAdminDb();
  if (!db) return 0;

  const userRef = db.collection("users").doc(userId);
  const now = new Date().toISOString();

  try {
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const current = Number(userSnap.data()?.rewardPoints ?? 0);
      const lifetime = Number(userSnap.data()?.lifetimeRewardPoints ?? 0);
      const next = current + points;

      transaction.set(
        userRef,
        {
          rewardPoints: next,
          lifetimeRewardPoints: lifetime + points,
          updatedAt: now,
        },
        { merge: true }
      );

      const txId = `rw_${Date.now()}_earn`;
      transaction.set(db.collection(REWARD_TX_COLLECTION).doc(txId), {
        id: txId,
        userId,
        type: "earn",
        points,
        balanceAfter: next,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        note: `Earned from booking ${booking.bookingNumber}`,
        createdAt: now,
      });
    });

    return points;
  } catch (error) {
    console.error("awardBookingRewardPoints failed:", error);
    return 0;
  }
}
