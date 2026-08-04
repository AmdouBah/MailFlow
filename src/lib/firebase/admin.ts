/**
 * Firebase Admin SDK — version allégée utilisant le SDK client Firebase
 * au lieu du SDK Admin, pour éviter la gestion de clés de service privées.
 *
 * Le SDK client est initialisé une seule fois (singleton pattern) et réutilisé
 * dans toutes les routes API server-side.
 */

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function initAdminApp(): App {
  if (_app) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || 'mailflow-bah-app';

  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  // Si on a les credentials complets, utiliser cert()
  if (
    privateKeyBase64 &&
    privateKeyBase64 !== 'your-base64-encoded-private-key' &&
    clientEmail &&
    !clientEmail.includes('firebase-adminsdk@mailflow')
  ) {
    try {
      const rawKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
      const privateKey = rawKey.replace(/\\n/g, '\n');
      _app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      console.log('[admin] Initialisé avec service account');
      return _app;
    } catch (e) {
      console.warn('[admin] Échec cert(), fallback projectId:', e);
    }
  }

  // Fallback : initialiser avec projectId uniquement
  // Les Firestore Security Rules contrôlent l'accès côté client
  // Pour les routes API, on utilise la REST API Firestore directement
  _app = initializeApp({ projectId });
  console.log('[admin] Initialisé en mode projectId-only (sans service account)');
  return _app;
}

export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(initAdminApp());
  return _db;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(initAdminApp());
  return _auth;
}
