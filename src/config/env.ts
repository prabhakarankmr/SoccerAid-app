export const API_VERSION = 'v1';

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? '',
  env: process.env.EXPO_PUBLIC_ENV ?? 'development',
} as const;

// Web-only: @react-native-firebase/auth has no web implementation (FRONTEND_INSTRUCTIONS.md
// §11.1), so the web build of phone auth goes through the plain `firebase` JS SDK instead
// (src/api/firebasePhoneAuth.web.ts), which needs its own app config — native builds read
// this from google-services.json/GoogleService-Info.plist and never touch these.
export const firebaseWebConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID ?? '',
} as const;
