import { readFileSync } from "fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const envPath = new URL("../.env.local", import.meta.url);
const envContent = readFileSync(envPath, "utf8");

for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value.replace(/\\n/g, "\n");
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const emails = process.argv.slice(2);
if (emails.length === 0) {
  console.error("Usage: node scripts/check-firebase-users.mjs email1 email2");
  process.exit(1);
}

const auth = getAuth();

for (const email of emails) {
  try {
    const user = await auth.getUserByEmail(email.trim().toLowerCase());
    console.log(
      JSON.stringify({
        email,
        exists: true,
        uid: user.uid,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        providers: user.providerData.map((p) => p.providerId),
        created: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
      })
    );

    if (process.argv.includes("--reset-link")) {
      const link = await auth.generatePasswordResetLink(email.trim().toLowerCase(), {
        url: "https://www.thesafarsathi.com/login?reset=done",
        handleCodeInApp: false,
      });
      console.log(
        JSON.stringify({
          email,
          resetLinkGenerated: true,
          linkHost: new URL(link).host,
        })
      );
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        email,
        exists: false,
        errorCode: error?.code ?? "unknown",
        errorMessage: error?.message ?? String(error),
      })
    );
  }
}
