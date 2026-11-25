import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function createFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    const serviceAccount: unknown = JSON.parse(serviceAccountJson);
    return initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      ...(projectId ? { projectId } : {}),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

export const firestore = getFirestore(createFirebaseApp());
