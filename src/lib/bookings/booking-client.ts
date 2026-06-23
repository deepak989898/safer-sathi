"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { Booking, PaymentStatus } from "@/types";

const COLLECTION = "bookings";

function sanitizeBooking<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function saveBookingToClient(booking: Booking): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  try {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, COLLECTION, booking.id),
      sanitizeBooking(booking),
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn("saveBookingToClient failed:", error);
    return false;
  }
}

export async function updateBookingPaymentOnClient(
  bookingId: string,
  updates: {
    paymentStatus: PaymentStatus;
    status?: Booking["status"];
    paidAmount?: number;
    paymentPlan?: Booking["paymentPlan"];
    paymentFailureReason?: string;
    lastPaymentAttemptAt?: string;
    notes?: string;
    userId?: string;
  }
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  try {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, COLLECTION, bookingId),
      {
        id: bookingId,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn("updateBookingPaymentOnClient failed:", error);
    return false;
  }
}

export async function syncBookingOnClient(booking: Booking): Promise<boolean> {
  return saveBookingToClient(booking);
}

export async function listBookingsFromClient(max = 500): Promise<Booking[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const snap = await getDocs(
      query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(max))
    );
    return snap.docs.map((d) => d.data() as Booking);
  } catch (error) {
    console.warn("listBookingsFromClient orderBy failed:", error);
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(query(collection(db, COLLECTION), limit(max)));
      return snap.docs
        .map((d) => d.data() as Booking)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (retryError) {
      console.warn("listBookingsFromClient failed:", retryError);
      return [];
    }
  }
}
