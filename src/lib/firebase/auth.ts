import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from './config';

// Connexion avec persistance locale (session permanente)
export async function signIn(email: string, password: string): Promise<User> {
  await setPersistence(auth, browserLocalPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  
  // Stocker le token dans un cookie pour le middleware
  const token = await credential.user.getIdToken();
  document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
  
  return credential.user;
}

// Déconnexion
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  // Supprimer le cookie
  document.cookie = 'firebase-token=; path=/; max-age=0';
}

// Observer l'état d'auth
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Rafraîchir le token cookie à chaque changement
      const token = await user.getIdToken();
      document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
    } else {
      document.cookie = 'firebase-token=; path=/; max-age=0';
    }
    callback(user);
  });
}

// Rafraîchir le token toutes les 50 minutes
export function startTokenRefresh(user: User): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const token = await user.getIdToken(true);
      document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
    } catch {
      // Ignorer les erreurs de refresh
    }
  }, 50 * 60 * 1000);
}
