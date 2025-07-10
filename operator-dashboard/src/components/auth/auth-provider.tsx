"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { getCurrentUser, onAuthStateChange, type AuthUser } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Initial user load
    refreshUser().finally(() => setLoading(false));

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange(async (supabaseUser: User | null) => {
      if (supabaseUser) {
        const authUser: AuthUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          role: supabaseUser.user_metadata?.role || "operator",
          name:
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split("@")[0] ||
            "",
        };
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
