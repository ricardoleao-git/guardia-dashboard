import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, data, type AuthUser } from "@/lib/data";

export type UserRole = "admin" | "operator" | "viewer";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
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

    if (!auth.available) {
      setLoading(false);
      setIsDemoMode(true);
      return;
    }

    setIsDemoMode(false);

    // Safety timeout — if getUser hangs, unblock the UI after 5s
    const sessionTimeout = setTimeout(() => setLoading(false), 5000);
    auth
      .getUser()
      .then((u) => {
        clearTimeout(sessionTimeout);
        setUser(u);
        if (u) {
          loadProfile(u.id, u.email || "");
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(sessionTimeout);
        setLoading(false);
      });

    // Listen for auth changes
    return auth.onAuthStateChange((u) => {
      setUser(u);
      if (u) {
        loadProfile(u.id, u.email || "");
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  const loadProfile = async (userId: string, email: string) => {
    let row: any = null;
    try {
      const rows = await data.profiles.list({ where: { id: userId }, limit: 1 });
      row = rows[0] ?? null;
    } catch {
      row = null;
    }

    if (row) {
      setProfile({
        id: row.id,
        email: row.email || email,
        full_name: row.full_name,
        role: row.role as UserRole,
        avatar_url: row.avatar_url,
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
    if (!auth.available) {
      return { error: "Supabase não configurado. Operando em modo demonstração." };
    }

    // Limpar flag de guest antes do login — quem veio do modo demo
    // ficaria preso em mock data sem isso (isGuestSession() === true)
    localStorage.removeItem("guardia_guest");
    setIsGuest(false);

    return auth.signInWithPassword(email, password);
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
    await auth.signOut();
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
