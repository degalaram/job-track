import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  // password: string; // Added for display as requested, but not recommended for production
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetchAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initialize loading to true
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Initialize isAuthenticated to false
  const queryClient = useQueryClient();

  const { data: authCheck, isLoading: isCheckLoading, refetch: refetchCheck } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/check"],
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes to keep session alive
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always check on mount
    staleTime: 0, // Always fetch fresh on mount
    gcTime: 30 * 24 * 60 * 60 * 1000, // Keep in cache for 30 days
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: authCheck?.authenticated === true,
    retry: false,
    refetchOnMount: true,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 24 * 60 * 60 * 1000, // Keep in cache for 30 days
  });

  // Use a combined loading state
  const combinedIsLoading = isCheckLoading || isUserLoading || isLoading;

  useEffect(() => {
    if (authCheck?.authenticated && userData) {
      setUser(userData);
      setIsAuthenticated(true);
    } else if (authCheck?.authenticated === false) {
      setUser(null);
      setIsAuthenticated(false);
    } else if (userData === null && authCheck?.authenticated) {
      setUser(null);
      setIsAuthenticated(false);
    } else if (authCheck === undefined) {
      // If authCheck is still undefined, we are in the initial loading phase
      // The loading state is already handled by setIsLoading(true)
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [authCheck, userData]);

  useEffect(() => {
    // This effect will run after authCheck and userData are potentially populated
    // It helps set the final loading and authentication state
    if (authCheck !== undefined) { // Only proceed if authCheck has a value (loaded or explicitly false)
      setIsLoading(false); // Once authCheck is determined, we can stop the initial loading
      if (authCheck.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null); // Ensure user is null if not authenticated
      }
    }
  }, [authCheck, userData]);


  const refetchAuth = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      const checkResult = await refetchCheck();
      if (checkResult.data?.authenticated) {
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Refetch auth failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsAuthenticated(false);
      queryClient.clear();
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: combinedIsLoading,
        isAuthenticated,
        logout,
        refetchAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}