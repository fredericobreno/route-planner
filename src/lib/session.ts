import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

const getAdminAuth = () => {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel stores the key's newlines as literal "\n".
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  return getAuth(app);
};

export const isAllowedEmail = (email: string | undefined) => {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
};

export const createSession = async (idToken: string) => {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (!decoded.email_verified || !isAllowedEmail(decoded.email)) return null;
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
};

export const verifySession = async (cookie: string | undefined) => {
  if (!cookie) return false;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    // Re-checked on every request so removing an email revokes access.
    return decoded.email_verified === true && isAllowedEmail(decoded.email);
  } catch (error) {
    console.warn("Invalid session cookie", error);
    return false;
  }
};
