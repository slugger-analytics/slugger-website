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
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { clearStores } from "@/lib/utils";
import { $user } from "@/lib/userStore";
import { logoutUser } from "@/api/auth";
import {
  $authTokens,
  setAuthTokens as storeAuthTokens,
  clearAuthTokens,
  getTokensForWidget,
  hasValidTokens,
  AuthTokens,
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
  
  // Check for token on initial load and client-side
  useEffect(() => {
    // Check if tokens are valid (client-side only)
    const isValid = hasValidTokens();
    setIsAuthenticated(isValid);
    
    // If tokens are valid, extract and set idToken for compatibility
    if (tokens && isValid) {
      setIdToken(tokens.idToken);
      setAccessToken(tokens.accessToken);
    } else {
      setIdToken("");
      setAccessToken("");
    }
    setLoading(false);
  }, [tokens]);

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
    storeAuthTokens(tokens, user);
  };

  // Get tokens for widget PostMessage (excludes refreshToken)
  const getWidgetTokens = () => {
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
