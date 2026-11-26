import {
  type ConfirmationResult,
  getAuth,
  getIdToken,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';

import { NoPendingOtpError } from './firebasePhoneAuthErrors';

// Single in-flight OTP confirmation at a time — not app state, just a handle between the
// login screen's signInWithPhoneNumber() call and the otp screen's confirm() call.
let pendingConfirmation: ConfirmationResult | null = null;
// Firebase's ConfirmationResult can only be confirmed once — confirming it again (even with
// the right code) throws. So once it succeeds, cache the resulting token: if the *backend*
// call after it fails and the user retries, confirmOtp() below must replay this cached token
// instead of re-confirming, or it'd incorrectly throw NoPendingOtpError on a perfectly valid
// retry (user report, 2026-11-25).
let cachedIdToken: string | null = null;

export async function sendOtp(e164Phone: string): Promise<void> {
  pendingConfirmation = await signInWithPhoneNumber(getAuth(), e164Phone);
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
  cachedIdToken = await getIdToken(credential.user);

  return cachedIdToken;
}
