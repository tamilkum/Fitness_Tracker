import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSavedUser(): User | null {
  const saved = localStorage.getItem("fitness-challenge-user");
  if (!saved) return null;
  try {
    return JSON.parse(saved) as User;
  } catch {
    localStorage.removeItem("fitness-challenge-user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readSavedUser);

  function login(newUser: User) {
    localStorage.setItem("fitness-challenge-user", JSON.stringify(newUser));
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("fitness-challenge-user");
    setUser(null);
  }

  function updateUser(updated: User) {
    localStorage.setItem("fitness-challenge-user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
