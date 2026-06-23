"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  approveUserAccount,
  AuthError,
  changeCustomerPassword,
  getFirebaseAuthErrorMessage,
  isStaffRegistrationInProgress,
  listAllUsers,
  loginUser,
  logoutUser,
  registerCustomer,
  registerStaff,
  requestPasswordReset,
  resolveAuthUser,
  suspendUserAccount,
} from "@/lib/auth/auth-service";
import { getLoginRedirect } from "@/lib/auth/constants";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { User, UserRole } from "@/types";

interface RegisterStaffInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<string>;
  registerStaffMember: (input: RegisterStaffInput) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<User[]>;
  approveUser: (userId: string) => Promise<void>;
  suspendUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      resolveAuthUser(null).then(setUser).finally(() => setLoading(false));
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isStaffRegistrationInProgress()) {
        setLoading(false);
        return;
      }

      try {
        const profile = await resolveAuthUser(firebaseUser);
        if (profile && firebaseUser) {
          if (
            profile.status === "pending" ||
            (!profile.approved && profile.role !== "customer")
          ) {
            await logoutUser();
            setUser(null);
          } else {
            setUser(profile);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const profile = await loginUser(email, password);
      setUser(profile);
      return getLoginRedirect(profile.role);
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  }, []);

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      try {
        const profile = await registerCustomer(input);
        setUser(profile);
        return getLoginRedirect(profile.role);
      } catch (error) {
        throw new Error(getFirebaseAuthErrorMessage(error));
      }
    },
    []
  );

  const registerStaffMember = useCallback(async (input: RegisterStaffInput) => {
    try {
      const result = await registerStaff(input);
      setUser(null);
      return result.requiresApproval;
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await requestPasswordReset(email);
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await changeCustomerPassword({ currentPassword, newPassword });
        setUser((prev) =>
          prev ? { ...prev, passwordIsBookingId: false, updatedAt: new Date().toISOString() } : prev
        );
      } catch (error) {
        throw new Error(getFirebaseAuthErrorMessage(error));
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const refreshUsers = useCallback(async () => listAllUsers(), []);

  const approveUser = useCallback(
    async (userId: string) => {
      if (!user) throw new Error("Not authenticated");
      await approveUserAccount(userId, user.role);
    },
    [user]
  );

  const suspendUser = useCallback(
    async (userId: string) => {
      if (!user) throw new Error("Not authenticated");
      await suspendUserAccount(userId, user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      registerStaffMember,
      forgotPassword,
      changePassword,
      logout,
      refreshUsers,
      approveUser,
      suspendUser,
    }),
    [
      user,
      loading,
      login,
      register,
      registerStaffMember,
      forgotPassword,
      changePassword,
      logout,
      refreshUsers,
      approveUser,
      suspendUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export { AuthError };
