import type { User, UserRole } from "@/types";

const STORAGE_KEY = "safar-sathi-local-users";

interface StoredUser extends User {
  password: string;
}

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function toPublicUser(user: StoredUser): User {
  const { password: _, ...publicUser } = user;
  return publicUser;
}

export function localRegister(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  autoApprove?: boolean;
}): User {
  const users = loadUsers();
  const email = input.email.toLowerCase().trim();

  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("An account with this email already exists. Please sign in.");
  }

  const isCustomer = input.role === "customer";
  const autoApprove = input.autoApprove ?? isCustomer;

  const user: StoredUser = {
    id: `local_${Date.now()}`,
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
    password: input.password,
    role: input.role,
    status: autoApprove ? "active" : "pending",
    approved: autoApprove,
    locale: "en",
    segment: "new",
    totalBookings: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);
  return toPublicUser(user);
}

export function localLogin(email: string, password: string): User {
  const users = loadUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );

  if (!user) {
    throw new Error("Invalid email or password. Please register first if you are new.");
  }

  return toPublicUser(user);
}

export function localGetUserById(id: string): User | null {
  const user = loadUsers().find((u) => u.id === id);
  return user ? toPublicUser(user) : null;
}

export function localGetAllUsers(): User[] {
  return loadUsers().map(toPublicUser);
}

export function localApproveUser(userId: string): User {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index < 0) throw new Error("User not found");

  users[index] = {
    ...users[index],
    status: "active",
    approved: true,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  return toPublicUser(users[index]);
}

export function localSuspendUser(userId: string): User {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index < 0) throw new Error("User not found");

  users[index] = {
    ...users[index],
    status: "suspended",
    approved: false,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  return toPublicUser(users[index]);
}

const SESSION_KEY = "safar-sathi-session";

export function localSetSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId);
}

export function localGetSession(): User | null {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return localGetUserById(id);
}

export function localClearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
