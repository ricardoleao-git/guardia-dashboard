import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type UserRole = "admin" | "operator" | "viewer";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
  isGuest: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
  signIn: async () => ({ error: "Not implemented" }),
  signInAsGuest: () => {},
  signOut: async () => {},
  isDemoMode: true,
  isGuest: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for guest session in localStorage
    const guestSession = localStorage.getItem("guardia_guest");
    if (guestSession === "true") {
      setIsGuest(true);
      setIsDemoMode(false);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      setIsDemoMode(true);
      return;
    }

    setIsDemoMode(false);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || "");
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || "");
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string, email: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data && !error) {
      setProfile({
        id: data.id,
        email: data.email || email,
        full_name: data.full_name,
        role: data.role as UserRole,
        avatar_url: data.avatar_url,
      });
    } else {
      // Profile doesn't exist yet — create a default
      setProfile({
        id: userId,
        email,
        full_name: email.split("@")[0],
        role: "operator",
        avatar_url: null,
      });
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase não configurado. Operando em modo demonstração." };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInAsGuest = () => {
    localStorage.setItem("guardia_guest", "true");
    setIsGuest(true);
    setIsDemoMode(false);
    setProfile({
      id: "guest",
      email: "convidado@guardia.demo",
      full_name: "Visitante (Demo)",
      role: "viewer",
      avatar_url: null,
    });
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem("guardia_guest");
    setIsGuest(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const isAdmin = isDemoMode || (!isGuest && profile?.role === "admin");

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInAsGuest, signOut, isDemoMode, isGuest, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
