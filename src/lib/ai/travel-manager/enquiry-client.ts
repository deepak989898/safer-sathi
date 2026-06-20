"use client";

import { addDoc, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import {
  buildEnquiryDocument,
  sanitizeEnquiryForFirestore,
  type BuildEnquiryInput,
} from "@/lib/ai/travel-manager/build-enquiry-document";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { AiAssistantEnquiry } from "@/types/ai-enquiry";

const COLLECTION = "ai_assistant_enquiries";

export async function logAiEnquiryFromClient(input: BuildEnquiryInput): Promise<boolean> {
  if (
    !input.userMessage ||
    input.userMessage === "__refresh__" ||
    input.userMessage === "__init__"
  ) {
    return false;
  }

  if (!isFirebaseConfigured()) return false;

  try {
    const db = getFirebaseDb();
    const doc = sanitizeEnquiryForFirestore(buildEnquiryDocument(input));
    await addDoc(collection(db, COLLECTION), doc);
    return true;
  } catch (error) {
    console.warn("logAiEnquiryFromClient failed:", error);
    return false;
  }
}

export async function listAiEnquiriesFromClient(
  max = 300
): Promise<AiAssistantEnquiry[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const snap = await getDocs(
      query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(max))
    );
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AiAssistantEnquiry, "id">),
    }));
  } catch (error) {
    console.warn("listAiEnquiriesFromClient orderBy failed:", error);
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(query(collection(db, COLLECTION), limit(max)));
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AiAssistantEnquiry, "id">),
      }));
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (retryError) {
      console.warn("listAiEnquiriesFromClient failed:", retryError);
      return [];
    }
  }
}
