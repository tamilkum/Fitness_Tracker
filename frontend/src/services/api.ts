import type {
  Achievement,
  Activity,
  ActivityInput,
  ChatResponse,
  CoachData,
  DashboardData,
  LeaderboardEntry,
  User,
} from "../types";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// ── Local credential store ────────────────────────────────────────────────────
// Keyed by email (lowercased). Each entry holds the hashed-ish password and
// the user ID so we can fetch the full record on sign-in.
// NOTE: This is a frontend-only credential store suitable for this demo app.
// A production app would use a real auth backend.

interface StoredAccount {
  email: string;
  password: string; // stored as plain text for this demo — no auth backend
  user_id: string;  // UUID
  profile: Omit<User, "id" | "created_at">;
}

function getAccounts(): Record<string, StoredAccount> {
  try {
    return JSON.parse(
      localStorage.getItem("fitness-challenge-accounts") ?? "{}",
    ) as Record<string, StoredAccount>;
  } catch {
    return {};
  }
}

function saveAccount(account: StoredAccount) {
  const accounts = getAccounts();
  accounts[account.email.toLowerCase()] = account;
  localStorage.setItem(
    "fitness-challenge-accounts",
    JSON.stringify(accounts),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : "The request failed. Check your details and try again.";

    throw new Error(message);
  }

  return body as T;
}

export const api = {
  registerUser(first_name: string, last_name: string) {
    return request<User>("/users/", {
      method: "POST",
      body: JSON.stringify({ first_name, last_name }),
    });
  },

  addActivity(user_id: string, activity: ActivityInput) {
    return request<Activity>("/activities/", {
      method: "POST",
      body: JSON.stringify({
        user_id,
        ...activity,
      }),
    });
  },

  getActivities(user_id: string) {
    return request<Activity[]>(
      `/activities/?user_id=${encodeURIComponent(user_id)}`,
    );
  },

  getLeaderboard() {
    return request<LeaderboardEntry[]>("/leaderboard/");
  },

  getDashboard(user_id: string) {
    return request<DashboardData>(`/users/${user_id}/dashboard`);
  },

  getCoach(user_id: string) {
    return request<CoachData>(`/users/${user_id}/coach`);
  },

  getAchievements(user_id: string) {
    return request<Achievement[]>(`/users/${user_id}/achievements/`);
  },

  updateUser(
    user_id: string,
    data: {
      first_name: string;
      last_name: string;
      age?: number | null;
      date_of_birth?: string | null;
      country?: string | null;
      state_province?: string | null;
      city?: string | null;
      house_address?: string | null;
    },
  ) {
    return request<User>(`/users/${user_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  askChat(question: string) {
    return request<ChatResponse>("/chat/", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  // ── Auth helpers ────────────────────────────────────────────────────────────

  /**
   * Creates a user record + stores hashed credentials in the backend DB.
   * Extended profile fields (age, location) are saved locally as before.
   */
  async createAccount(profile: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    age: number;
    date_of_birth: string;
    country: string;
    state_province: string;
    city_village: string;
    address: string;
  }): Promise<User> {
    // Step 1 — create the user row on the backend
    let backendUser: User;
    try {
      backendUser = await request<User>("/users/", {
        method: "POST",
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
        }),
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("already registered")
      ) {
        throw new Error(
          "That name is already registered. Please enter a different first or last name, or add a nickname to distinguish your account.",
        );
      }
      throw err;
    }

    // Step 2 — store hashed credentials in the backend credentials table
    interface AuthResponse {
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
      created_at: string;
    }
    try {
      await request<AuthResponse>("/auth/create", {
        method: "POST",
        body: JSON.stringify({
          user_id: backendUser.id,
          email: profile.email.trim().toLowerCase(),
          password: profile.password,
        }),
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("already exists")
      ) {
        throw new Error(
          "An account with this email already exists. Sign in instead.",
        );
      }
      throw err;
    }

    // Step 2.5 — PATCH the profile fields (age, dob, location) into the DB
    // now that we have the user_id from Step 1
    await request<User>(`/users/${backendUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        first_name: profile.first_name,
        last_name: profile.last_name,
        age: profile.age || null,
        date_of_birth: profile.date_of_birth || null,
        country: profile.country || null,
        state_province: profile.state_province || null,
        city: profile.city_village || null,
        house_address: profile.address || null,
      }),
    });

    // Step 3 — keep email in localStorage (only field not in the DB)
    const fullUser: User = {
      ...backendUser,
      email: profile.email,
      age: profile.age,
      date_of_birth: profile.date_of_birth,
      country: profile.country,
      state_province: profile.state_province,
      city: profile.city_village,
      house_address: profile.address,
      city_village: profile.city_village,
      address: profile.address,
    };

    saveAccount({
      email: profile.email.toLowerCase(),
      password: "",            // no longer stored — backend holds the hash
      user_id: backendUser.id,
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      },
    });

    return fullUser;
  },

  /**
   * Signs in via backend credential check (bcrypt verify).
   * Returns the user record from the DB (single source of truth).
   */
  async signIn(email: string, password: string): Promise<User> {
    interface AuthResponse {
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
      created_at: string;
    }

    // Verify credentials against the backend DB
    const authData = await request<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    // Fetch fresh full user record — DB is now the source of truth for all fields
    const backendUser = await request<User>(`/users/${authData.user_id}`);

    // Attach email (stored in credentials table, not in users table)
    // and keep city_village/address aliases for UI compatibility
    return {
      ...backendUser,
      email: authData.email,
      city_village: backendUser.city ?? undefined,
      address: backendUser.house_address ?? undefined,
    };
  },
};
