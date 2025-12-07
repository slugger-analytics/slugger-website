/**
 * Auth Store - Session-based token storage for widget integration
 *
 * Stores JWT tokens in sessionStorage (cleared when browser closes).
 * More secure than localStorage, but persists across page navigations.
 * Used by WidgetFrame to pass tokens to embedded widgets via PostMessage.
 */

import { atom } from "nanostores";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // 'admin' | 'widget developer' | 'league' | 'master'
  teamId?: string;
  teamRole?: string;
  isAdmin?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  user?: AuthUser; // User info for widget integration
}

// Storage key
const STORAGE_KEY = "slugger_auth_tokens";

// Use localStorage instead of sessionStorage to persist across proxy origins
// This is needed because Cascade browser preview uses a different origin (127.0.0.1:port)
// than the actual app (localhost:3000), and sessionStorage is origin-specific.
// localStorage persists across origins in the same browser.

// Initialize from localStorage if available
function getInitialTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    console.log("[auth-store] getInitialTokens: SSR mode, returning null");
    return null;
  }
  try {
    // Try localStorage first (persists across origins)
    let stored = localStorage.getItem(STORAGE_KEY);
    console.log("[auth-store] getInitialTokens: localStorage value:", stored ? "FOUND" : "NOT FOUND");
    
    if (!stored) return null;
    const tokens = JSON.parse(stored) as AuthTokens;
    // Check if expired
    if (Date.now() > tokens.expiresAt) {
      console.log("[auth-store] getInitialTokens: Token expired, clearing");
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    console.log("[auth-store] getInitialTokens: Valid token found, expires:", new Date(tokens.expiresAt).toLocaleString());
    return tokens;
  } catch (e) {
    console.error("[auth-store] getInitialTokens: Error parsing tokens:", e);
    return null;
  }
}

// Session-based storage (cleared when browser closes, persists across navigations)
export const $authTokens = atom<AuthTokens | null>(getInitialTokens());

/**
 * Store auth tokens after successful login
 */
export function setAuthTokens(
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number; // seconds until expiry
  },
  user?: {
    id: string;
    email: string;
    first: string;
    last: string;
    role: string;
    teamId?: string;
    teamRole?: string;
    is_admin?: boolean;
  }
): void {
  console.log("[auth-store] setAuthTokens called with expiresIn:", tokens.expiresIn);
  console.log("[auth-store] User info:", user);
  
  const authTokens: AuthTokens = {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user: user ? {
      id: user.id,
      email: user.email,
      firstName: user.first,
      lastName: user.last,
      role: user.role,
      teamId: user.teamId,
      teamRole: user.teamRole,
      isAdmin: user.is_admin,
    } : undefined,
  };
  
  console.log("[auth-store] Setting atom with expiresAt:", new Date(authTokens.expiresAt).toLocaleString());
  $authTokens.set(authTokens);
  
  // Persist to localStorage (works across proxy origins)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authTokens));
      console.log("[auth-store] Saved to localStorage successfully");
    } catch (e) {
      console.error("[auth-store] Failed to save to localStorage:", e);
    }
  }
}

/**
 * Clear auth tokens on logout
 */
export function clearAuthTokens(): void {
  $authTokens.set(null);
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get access token if valid (not expired)
 */
export function getAccessToken(): string | null {
  const tokens = $authTokens.get();
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt) {
    // Token expired
    return null;
  }
  return tokens.accessToken;
}

/**
 * Get ID token if valid (not expired)
 */
export function getIdToken(): string | null {
  const tokens = $authTokens.get();
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt) {
    return null;
  }
  return tokens.idToken;
}

/**
 * Check if tokens are valid (exist and not expired)
 */
export function hasValidTokens(): boolean {
  const tokens = $authTokens.get();
  if (!tokens) return false;
  return Date.now() < tokens.expiresAt;
}

/**
 * Get tokens for widget PostMessage (excludes refreshToken for security)
 * Includes user info for widget developers
 */
export function getTokensForWidget(): {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  user?: AuthUser;
} | null {
  const tokens = $authTokens.get();
  if (!tokens || Date.now() > tokens.expiresAt) {
    return null;
  }
  return {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    expiresAt: tokens.expiresAt,
    user: tokens.user,
  };
}

/**
 * Get refresh token (for internal use only)
 */
export function getRefreshToken(): string | null {
  const tokens = $authTokens.get();
  return tokens?.refreshToken || null;
}

/**
 * Update tokens after refresh (preserves user info and refresh token)
 */
export function updateTokensAfterRefresh(newTokens: {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}): void {
  const currentTokens = $authTokens.get();
  if (!currentTokens) {
    console.warn("[auth-store] Cannot refresh - no existing tokens");
    return;
  }

  const updatedTokens: AuthTokens = {
    accessToken: newTokens.accessToken,
    idToken: newTokens.idToken,
    refreshToken: currentTokens.refreshToken, // Keep existing refresh token
    expiresAt: Date.now() + newTokens.expiresIn * 1000,
    user: currentTokens.user, // Preserve user info
  };

  console.log("[auth-store] Tokens refreshed, new expiresAt:", new Date(updatedTokens.expiresAt).toLocaleString());
  $authTokens.set(updatedTokens);

  // Persist to localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTokens));
      console.log("[auth-store] Refreshed tokens saved to localStorage");
    } catch (e) {
      console.error("[auth-store] Failed to save refreshed tokens:", e);
    }
  }
}

/**
 * Check if tokens need refresh (within 5 minutes of expiry)
 */
export function shouldRefreshTokens(): boolean {
  const tokens = $authTokens.get();
  if (!tokens) return false;
  
  const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  return Date.now() > (tokens.expiresAt - REFRESH_THRESHOLD);
}

/**
 * Get time until token expiry in milliseconds
 */
export function getTimeUntilExpiry(): number {
  const tokens = $authTokens.get();
  if (!tokens) return 0;
  return Math.max(0, tokens.expiresAt - Date.now());
}
