import { router } from 'expo-router';
import { create } from 'zustand';

import { API_VERSION, env } from '../config/env';
import { secureStorage } from './secureStorage';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (tokens: TokenPair) => Promise<void>;
  /** Called by the API client on a 401 — returns whether the retry should proceed. */
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

// Session tokens only — no server data (name, displayName, ...) lives here; that's TanStack
// Query's job via useMe() (FRONTEND_INSTRUCTIONS.md §2: "small stores only, no server data").
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken, refreshToken, hydrated: true });
  },

  setTokens: async ({ accessToken, refreshToken }) => {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  refreshSession: async () => {
    const { refreshToken } = get();

    if (!refreshToken) {
      await get().logout();
      router.replace('/(auth)/login');
      return false;
    }

    try {
      const res = await fetch(`${env.apiUrl}/api/${API_VERSION}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // The refresh token itself was rejected (expired/revoked/reused) — this session is
        // genuinely over, not a transient blip. Every screen past app/index.tsx's gate assumes
        // a logged-in session exists, so don't leave the caller's failed request as the only
        // sign anything's wrong: clear the dead tokens and send the user back to login instead
        // of letting them sit in the app on top of empty/failed queries (e.g. an empty-looking
        // profile screen).
        await get().logout();
        router.replace('/(auth)/login');
        return false;
      }

      const json = (await res.json()) as { data: TokenPair };
      await get().setTokens(json.data);
      return true;
    } catch {
      // Network failure reaching /auth/refresh — the refresh token itself might still be
      // good, so don't log the user out over a connectivity blip. The caller's original
      // request still fails; it'll just retry next time there's a network.
      return false;
    }
  },

  logout: async () => {
    await Promise.all([
      secureStorage.deleteItem(ACCESS_TOKEN_KEY),
      secureStorage.deleteItem(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken: null, refreshToken: null });
  },
}));
