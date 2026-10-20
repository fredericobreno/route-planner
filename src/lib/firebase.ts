import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  inMemoryPersistence,
} from "firebase/auth";

// The server session cookie is the source of truth, so the client SDK
// keeps nothing in browser storage.
export const getClientAuth = () => {
  if (getApps().length) return getAuth(getApp());
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  return initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
};
