import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin-app";

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
