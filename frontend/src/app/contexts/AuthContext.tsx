/// contexts/AuthContext.tsx
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { clearStores } from "@/lib/utils";
import { $user, setUser } from "@/lib/userStore";
import { logoutUser, validateSession, bootstrapUser } from "@/api/auth";
import {
  $authTokens,
  setAuthTokens,
  clearAuthTokens,
  getTokensForWidget,
  hasValidTokens,
  AuthUser,
} from "@/lib/auth-store";

// The AuthContextType interface defines the shape of the context object
interface AuthContextType {
  // Indicates if the user is authenticated
  isAuthenticated: boolean;
  // The ID token for the authenticated user
  idToken: string;
  // The access token for the authenticated user (currently not used)
  accessToken: string;
  // Indicates if the authentication state is loading
  loading: boolean;
  // Function to set the ID token
  setIdToken: Dispatch<SetStateAction<string>>;
  // Function to set the access token
  setAccessToken: Dispatch<SetStateAction<string>>;
  // Function to log the user out
  logout: () => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  // Function to store tokens with expiry for widget integration
  storeTokens: (
    tokens: {
      accessToken: string;
      idToken: string;
      refreshToken: string;
      expiresIn: number;
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
  ) => void;
  // Function to get tokens for widget PostMessage
  getWidgetTokens: () => {
    accessToken: string;
    idToken: string;
    expiresAt: number;
    user?: AuthUser;
  } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// The AuthProvider component provides the authentication context to its children
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State to track the ID token
  const [idToken, setIdToken] = useState<string>("");
  // State to track the access token (currently not used)
  const [accessToken, setAccessToken] = useState<string>("");
  // State to track if the authentication state is loading
  const [loading, setLoading] = useState(true);
  // State to track authentication (deferred to avoid SSR mismatch)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Use auth-store for authentication state
  const tokens = useStore($authTokens);
  const user = useStore($user);
  const router = useRouter();
  const sessionChecked = useRef(false);

  // Check for existing session on initial load (handles page refresh)
  useEffect(() => {
    const checkExistingSession = async () => {
      // Only run once
      if (sessionChecked.current) return;

      // If the URL contains ?slugger_token=<CognitoAccessToken>, exchange it
      // for a server session without requiring email/password.
      const searchParams = new URLSearchParams(window.location.search);
      const sluggerToken = searchParams.get("slugger_token");

      if (sluggerToken) {
        sessionChecked.current = true;
        try {
          const bootstrappedUser = await bootstrapUser(sluggerToken);

          setUser({
            id:       String(bootstrappedUser.id),
            email:    bootstrappedUser.email,
            first:    bootstrappedUser.first   ?? "",
            last:     bootstrappedUser.last    ?? "",
            role:     bootstrappedUser.role,
            teamId:   bootstrappedUser.teamId  ? String(bootstrappedUser.teamId) : "",
            is_admin: bootstrappedUser.is_admin ?? false,
          });

          setIsAuthenticated(true);

          // Remove the token from the URL so it is never visible after load.
          searchParams.delete("slugger_token");
          const clean =
            window.location.pathname +
            (searchParams.toString() ? "?" + searchParams.toString() : "");
          window.history.replaceState({}, "", clean);
        } catch (error) {
          console.error("Bootstrap failed:", error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check if tokens are valid in auth-store first
      const hasTokens = hasValidTokens();

      // If no user data after hydration and no valid tokens, user is not logged in
      if (!user.role || !user.id) {
        if (hasTokens && tokens) {
          // Tokens exist but user store not hydrated - set from tokens
          setIdToken(tokens.idToken);
          setAccessToken(tokens.accessToken);
          setIsAuthenticated(true);
        }
        setLoading(false);
        return;
      }

      sessionChecked.current = true;

      try {
        // User data exists in persistent store, validate the server session
        const sessionValid = await validateSession();

        if (sessionValid) {
          setIsAuthenticated(true);
          // Sync tokens from auth-store if available
          if (tokens && hasTokens) {
            setIdToken(tokens.idToken);
            setAccessToken(tokens.accessToken);
          }
        } else {
          // Session expired - clear stores
          clearAuthTokens();
          clearStores();
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
        // On error, clear stores to be safe
        clearAuthTokens();
        clearStores();
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, [user.role, user.id, tokens]);

  // Also set authenticated when idToken is set (after fresh login)
  useEffect(() => {
    if (idToken && user.role) {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [idToken, user.role]);

  // Store tokens with expiry for widget integration
  const storeTokens = (
    tokens: {
      accessToken: string;
      idToken: string;
      refreshToken: string;
      expiresIn: number;
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
  ) => {
    setAuthTokens(tokens, user);
  };

  // Get tokens for widget PostMessage (excludes refreshToken for security)
  const getWidgetTokens = (): {
    accessToken: string;
    idToken: string;
    expiresAt: number;
    user?: AuthUser;
  } | null => {
    return getTokensForWidget();
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutUser();
      clearAuthTokens(); // Clear auth-store tokens
      clearStores();
      router.push("/"); // Redirect to home page on logout
      setAccessToken("");
      setIdToken("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        idToken,
        accessToken,
        loading,
        setIdToken,
        setAccessToken,
        logout,
        setLoading,
        storeTokens,
        getWidgetTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
