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

interface AuthContextType {
  isAuthenticated: boolean;
  idToken: string;
  userRole: string;
  accessToken: string;
  loading: boolean;
  login: (token: string, role: string) => void;
  logout: () => void;
  userId: string;
  setUserId: Dispatch<SetStateAction<string>>;
  setIdToken: Dispatch<SetStateAction<string>>;
  setUserRole: Dispatch<SetStateAction<string>>;
  setAccessToken: Dispatch<SetStateAction<string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("-1");
  const [idToken, setIdToken] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>(""); // not used anywhere currently, but accessToken was previously stored in localstorage
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for token on initial load
  useEffect(() => {
    // const token = localStorage.getItem("idToken");
    // const role = localStorage.getItem("role");
    if (idToken && userRole) {
      setIsAuthenticated(true);
      // setUserRole(role);
    }
    setLoading(false);
  }, [idToken, userRole]);

  const login = (token: string, role: string) => {
    setIsAuthenticated(true);
    setIdToken(token);
    setUserRole(role);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole("");
    router.push("/login"); // Redirect to login page on logout
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        idToken,
        userRole,
        accessToken,
        loading,
        login,
        logout,
        userId,
        setUserId,
        setIdToken,
        setUserRole,
        setAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
