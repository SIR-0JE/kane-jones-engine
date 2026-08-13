export interface UserSession {
  id: string;
  email: string;
  depotName: string;
  clientId: string;
}

const SESSION_KEY = "kj_auth_session";
const USERS_KEY = "kj_registered_users";

export const DEMO_USER: UserSession = {
  id: "demo-kane-jones-owner",
  email: "kj-admin@kane-jones.ng",
  depotName: "Kane-Jones Depot",
  clientId: "kane-jones",
};

export function slugifyDepotName(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "my-depot";
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

function notifyAuthChange() {
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
  const { depotName, email, password, confirmPassword } = params;
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
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();

  return session;
}

export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChange();
  }
}
