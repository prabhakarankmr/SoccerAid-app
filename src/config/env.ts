export const API_VERSION = 'v1';

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? '',
  env: process.env.EXPO_PUBLIC_ENV ?? 'development',
} as const;
