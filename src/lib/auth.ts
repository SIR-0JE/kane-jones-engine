export interface UserSession {
  id: string;
  email: string;
  depotName: string;
  clientId: string;
  name?: string;
  avatarUrl?: string;
}

const SESSION_KEY = "kj_auth_session";
const USERS_KEY = "kj_registered_users";

export const DEMO_USER: UserSession = {
  id: "demo-kane-jones-owner",
  email: "kj-admin@kane-jones.ng",
  depotName: "Kane-Jones Depot",
  clientId: "kane-jones",
  name: "Kane-Jones Admin",
};

export function slugifyDepotName(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "my-depot";
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "DP";
}

export function getRegisteredUsers(): (UserSession & { passwordHash: string })[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getCurrentSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kj_auth_changed"));
  }
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function signupUser(params: {
  depotName: string;
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): Promise<UserSession> {
  const { depotName, name, email, password, confirmPassword } = params;
  const cleanEmail = email.trim().toLowerCase();

  if (!depotName.trim()) {
    throw new Error("Please enter your depot or company name.");
  }

  if (!cleanEmail || !validateEmail(cleanEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const clientId = slugifyDepotName(depotName);
  const users = getRegisteredUsers();

  const existing = users.find((u) => u.email === cleanEmail);
  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const newUser: UserSession & { passwordHash: string } = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    depotName: depotName.trim(),
    clientId: clientId,
    name: name?.trim() || "",
    passwordHash: password,
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Seed depot row in Supabase via backend API
  try {
    const formData = new FormData();
    formData.append("client_id", clientId);
    formData.append("display_name", depotName.trim());
    await fetch("/api/depots/register", {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    console.warn("Backend depot registration warning:", err);
  }

  const session: UserSession = {
    id: newUser.id,
    email: newUser.email,
    depotName: newUser.depotName,
    clientId: newUser.clientId,
    name: newUser.name,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();

  return session;
}

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<UserSession> {
  const { email, password } = params;
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !validateEmail(cleanEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!password) {
    throw new Error("Please enter your password.");
  }

  // Check demo credentials
  if (cleanEmail === DEMO_USER.email && password === "KaneJones@2026") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_USER));
    notifyAuthChange();
    return DEMO_USER;
  }

  const users = getRegisteredUsers();
  const user = users.find((u) => u.email === cleanEmail);

  if (!user || user.passwordHash !== password) {
    throw new Error("That email or password is incorrect.");
  }

  const session: UserSession = {
    id: user.id,
    email: user.email,
    depotName: user.depotName,
    clientId: user.clientId,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();

  return session;
}

export async function updateUserProfile(params: {
  name?: string;
  depotName?: string;
  avatarUrl?: string;
}): Promise<UserSession> {
  const current = getCurrentSession();
  if (!current) {
    throw new Error("No active user session found.");
  }

  const updatedSession: UserSession = {
    ...current,
    name: params.name !== undefined ? params.name.trim() : current.name,
    depotName: params.depotName !== undefined ? params.depotName.trim() : current.depotName,
    avatarUrl: params.avatarUrl !== undefined ? params.avatarUrl : current.avatarUrl,
  };

  // Update localStorage session
  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));

  // Update registered users array
  const users = getRegisteredUsers();
  const idx = users.findIndex((u) => u.id === current.id || u.email === current.email);
  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      name: updatedSession.name,
      depotName: updatedSession.depotName,
      avatarUrl: updatedSession.avatarUrl,
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Sync updated depot display_name with Supabase backend
  if (params.depotName !== undefined && params.depotName.trim()) {
    try {
      const formData = new FormData();
      formData.append("client_id", updatedSession.clientId);
      formData.append("display_name", updatedSession.depotName);
      await fetch("/api/depots/update", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.warn("Depot update API warning:", err);
    }
  }

  notifyAuthChange();
  return updatedSession;
}

export async function changeUserPassword(params: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  const current = getCurrentSession();
  if (!current) {
    throw new Error("No active user session found.");
  }

  const { currentPassword, newPassword, confirmPassword } = params;

  if (!currentPassword) {
    throw new Error("Please enter your current password.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match.");
  }

  const users = getRegisteredUsers();
  const user = users.find((u) => u.id === current.id || u.email === current.email);

  if (user && user.passwordHash !== currentPassword) {
    throw new Error("Current password is incorrect.");
  }

  if (user) {
    user.passwordHash = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChange();
  }
}
