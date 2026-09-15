import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

const TOKEN_STORAGE_KEY = 'alumni_portal_google_access_token';
const TOKEN_EXPIRY_KEY = 'alumni_portal_token_expires_at';

// Helper to save token with expiry
export const saveToken = (token: string, expiresInSeconds: number = 3600): void => {
  cachedAccessToken = token;
  // Expire 2 minutes early for safety buffer
  const expiresAt = Date.now() + Math.max(300, expiresInSeconds - 120) * 1000;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  } catch {}
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  } catch {}
};

// Helper to load stored token if still valid
export const loadStoredToken = (): string | null => {
  try {
    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const expiryStr =
      localStorage.getItem(TOKEN_EXPIRY_KEY) || sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    if (token && expiryStr) {
      const expiresAt = parseInt(expiryStr, 10);
      if (Date.now() < expiresAt) {
        return token;
      }
    }
  } catch {}
  return null;
};

// Clear token on sign out
export const clearStoredToken = (): void => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
};

let isSigningIn = false;
// Initialize from storage so token is immediately available before any auth state changes
let cachedAccessToken: string | null = loadStoredToken();

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (!cachedAccessToken) {
    cachedAccessToken = loadStoredToken();
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || loadStoredToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        // User is logged in to Firebase, but access token needs fresh retrieval
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token with Spreadsheet permissions.');
    }

    saveToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = loadStoredToken();
  }
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null): void => {
  if (token) {
    saveToken(token);
  } else {
    clearStoredToken();
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  clearStoredToken();
};

