import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin-app";

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
