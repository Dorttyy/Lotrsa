import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api, getAuthToken, setAuthToken, User } from "@/src/utils/api";
import { registerForPush } from "@/src/utils/push";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "auth_token";
// Migration only: remove the old browsing flag without deleting user data.
const LEGACY_GUEST_KEY = "guest_browsing_v1";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  googleLogin: (sessionId: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  const persistence = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback((write: () => Promise<void>) => {
    const pending = persistence.current.catch(() => {}).then(write);
    persistence.current = pending;
    return pending;
  }, []);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const isCurrent = () => active && version === sessionVersion.current;
    const restore = async () => {
      try {
        await storage.removeItem(LEGACY_GUEST_KEY);
        const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
        if (!isCurrent()) return;
        if (token) {
          setAuthToken(token);
          const me = await api.get<User>("/auth/me");
          if (!isCurrent()) return;
          if (me.is_guest) {
            setAuthToken(null);
            await persist(async () => {
              if (isCurrent()) await storage.secureRemove(TOKEN_KEY);
            });
            return;
          }
          setUser(me);
          registerForPush();
        }
      } catch (error) {
        if (!isCurrent()) return;
        setAuthToken(null);
        const status = (error as { status?: number } | null)?.status;
        // A temporary outage must not erase a saved, potentially valid session.
        if (status === 401 || status === 403) {
          await persist(async () => {
            if (isCurrent()) await storage.secureRemove(TOKEN_KEY);
          });
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, [persist]);

  const applyAuth = useCallback(
    async (resp: { token: string; user: User }, version: number) => {
      if (resp.user.is_guest) {
        throw new Error("Guest access is no longer available. Please create an account.");
      }
      const assertCurrent = () => {
        if (version !== sessionVersion.current) {
          throw new Error("Sign-in was cancelled because the session changed.");
        }
      };
      assertCurrent();
      await persist(async () => {
        assertCurrent();
        await storage.secureSet(TOKEN_KEY, resp.token);
        await storage.removeItem(LEGACY_GUEST_KEY);
      });
      assertCurrent();
      setAuthToken(resp.token);
      setUser(resp.user);
      registerForPush();
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>("/auth/register", { email, password, name });
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const googleLogin = useCallback(
    async (sessionId: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>("/auth/google", { session_id: sessionId });
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    setAuthToken(null);
    setUser(null);
    setLoading(false);
    await persist(async () => {
      await storage.secureRemove(TOKEN_KEY);
      await storage.removeItem(LEGACY_GUEST_KEY);
    });
  }, [persist]);

  const setAuthenticatedUser = useCallback((next: User) => {
    // Ignore a previous screen's late response after the session was ended.
    if (getAuthToken() && !next.is_guest) setUser(next);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, googleLogin, logout, setUser: setAuthenticatedUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
