import { getApps, initializeApp } from 'firebase/app';
import {
  type ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';

import { firebaseWebConfig } from '../config/env';

// Metro picks this file over firebasePhoneAuth.ts when bundling for web (platform
// extension resolution — see FRONTEND_INSTRUCTIONS.md §11.1). @react-native-firebase/auth
// has no web implementation at all, so web uses the plain `firebase` JS SDK directly, which
// — unlike native phone auth — needs a reCAPTCHA verifier bound to a real DOM node
// (rendered by `(auth)/login.tsx` as <View nativeID={RECAPTCHA_CONTAINER_ID} />).
export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

const app = getApps()[0] ?? initializeApp(firebaseWebConfig);
const auth = getAuth(app);

let verifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

function getVerifier(): RecaptchaVerifier {
  verifier ??= new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
  return verifier;
}

export async function sendOtp(e164Phone: string): Promise<void> {
  pendingConfirmation = await signInWithPhoneNumber(auth, e164Phone, getVerifier());
}

/** Confirms the code with Firebase and returns the ID token for `/auth/firebase/verify`. */
export async function confirmOtp(code: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new Error('No OTP request in progress — go back and request a new code.');
  }

  const credential = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;

  return credential.user.getIdToken();
}
