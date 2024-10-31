/// contexts/AuthContext.tsx
"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';


interface AuthContextType {
    isAuthenticated: boolean;
    userRole: string | null;
    loading: boolean;
    login: (token: string, role: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Check for token on initial load
    useEffect(() => {
        console.log("Hereeee")
        const token = localStorage.getItem('idToken');
        console.log(token)
        const role = localStorage.getItem('role');
        console.log(role)
        if (token && role) {
            setIsAuthenticated(true);
            setUserRole(role);
        }
        setLoading(false);
    }, []);

    const login = (token: string, role: string) => {
        localStorage.setItem('idToken', token);
        localStorage.setItem('role', role);
        setIsAuthenticated(true);
        setUserRole(role);
    };

    const logout = () => {
        localStorage.removeItem('idToken');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setUserRole(null);
        router.push('/login'); // Redirect to login page on logout
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, userRole, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
