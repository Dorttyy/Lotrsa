import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api, setAuthToken, User } from "@/src/utils/api";
import { GUEST_BROWSING_KEY, isGuestBrowsingMode, setGuestBrowsingMode } from "@/src/utils/guest-access";
import { registerForPush } from "@/src/utils/push";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "auth_token";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Local, unauthenticated browsing; distinct from a server guest account. */
  isGuestBrowsing: boolean;
  enterGuestBrowsing: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  googleLogin: (sessionId: string) => Promise<User>;
  guestLogin: () => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestBrowsing, setIsGuestBrowsing] = useState(false);
  // Late restoration/login responses must not undo an explicit guest choice.
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
        const browsing = await storage.getItem<boolean>(GUEST_BROWSING_KEY, false);
        if (!isCurrent()) return;
        if (browsing === true) {
          setAuthToken(null);
          setGuestBrowsingMode(true);
          setIsGuestBrowsing(true);
          return;
        }
        const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
        if (!isCurrent()) return;
        if (token) {
          setAuthToken(token);
          const me = await api.get<User>("/auth/me");
          if (!isCurrent()) return;
          setUser(me);
          registerForPush();
        }
      } catch {
        if (!isCurrent()) return;
        setAuthToken(null);
        await persist(async () => {
          if (isCurrent()) await storage.secureRemove(TOKEN_KEY);
        });
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, [persist]);

  const enterGuestBrowsing = useCallback(() => {
    sessionVersion.current += 1;
    setAuthToken(null);
    setGuestBrowsingMode(true);
    setUser(null);
    setIsGuestBrowsing(true);
    setLoading(false);
    // Entry is immediate and never waits for an API or storage operation.
    void persist(async () => {
      await storage.secureRemove(TOKEN_KEY);
      await storage.setItem(GUEST_BROWSING_KEY, true);
    });
  }, [persist]);

  const applyAuth = useCallback(
    async (resp: { token: string; user: User }, version: number) => {
      const assertCurrent = () => {
        if (version !== sessionVersion.current) {
          throw new Error("Sign-in was cancelled because the session changed.");
        }
      };
      assertCurrent();
      await persist(async () => {
        assertCurrent();
        await storage.secureSet(TOKEN_KEY, resp.token);
        await storage.removeItem(GUEST_BROWSING_KEY);
      });
      assertCurrent();
      setGuestBrowsingMode(false);
      setAuthToken(resp.token);
      setIsGuestBrowsing(false);
      setUser(resp.user);
      registerForPush();
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>(
        "/auth/login",
        { email, password },
      );
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>(
        "/auth/register",
        { email, password, name },
      );
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const guestLogin = useCallback(async () => {
    const version = ++sessionVersion.current;
    setLoading(false);
    const resp = await api.post<{ token: string; user: User }>("/auth/guest");
    await applyAuth(resp, version);
    return resp.user;
  }, [applyAuth]);

  const googleLogin = useCallback(
    async (sessionId: string) => {
      const version = ++sessionVersion.current;
      setLoading(false);
      const resp = await api.post<{ token: string; user: User }>(
        "/auth/google",
        { session_id: sessionId },
      );
      await applyAuth(resp, version);
      return resp.user;
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    setAuthToken(null);
    setGuestBrowsingMode(false);
    setIsGuestBrowsing(false);
    setUser(null);
    setLoading(false);
    await persist(async () => {
      await storage.secureRemove(TOKEN_KEY);
      await storage.removeItem(GUEST_BROWSING_KEY);
    });
  }, [persist]);

  const setAuthenticatedUser = useCallback((next: User) => {
    // Ignore a previously mounted member screen's late response after Guest.
    if (!isGuestBrowsingMode()) setUser(next);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isGuestBrowsing, enterGuestBrowsing, login, register, googleLogin, guestLogin, logout, setUser: setAuthenticatedUser }}
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
