import { getApps, initializeApp } from 'firebase/app';
import {
  type ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';

import { firebaseWebConfig } from '../config/env';
import { NoPendingOtpError } from './firebasePhoneAuthErrors';

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
// Firebase's ConfirmationResult can only be confirmed once — confirming it again (even with
// the right code) throws. So once it succeeds, cache the resulting token: if the *backend*
// call after it fails and the user retries, confirmOtp() below must replay this cached token
// instead of re-confirming, or it'd incorrectly throw NoPendingOtpError on a perfectly valid
// retry (user report, 2026-11-25).
let cachedIdToken: string | null = null;

function getVerifier(): RecaptchaVerifier {
  verifier ??= new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
  return verifier;
}

export async function sendOtp(e164Phone: string): Promise<void> {
  pendingConfirmation = await signInWithPhoneNumber(auth, e164Phone, getVerifier());
  cachedIdToken = null;
}

/** Confirms the code with Firebase and returns the ID token for `/auth/firebase/verify`. */
export async function confirmOtp(code: string): Promise<string> {
  if (cachedIdToken) {
    return cachedIdToken;
  }

  if (!pendingConfirmation) {
    throw new NoPendingOtpError();
  }

  const credential = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
  cachedIdToken = await credential.user.getIdToken();

  return cachedIdToken;
}
