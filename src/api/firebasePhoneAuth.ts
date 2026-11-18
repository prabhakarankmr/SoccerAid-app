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

export async function sendOtp(e164Phone: string): Promise<void> {
  pendingConfirmation = await signInWithPhoneNumber(getAuth(), e164Phone);
}

/** Confirms the code with Firebase and returns the ID token for `/auth/firebase/verify`. */
export async function confirmOtp(code: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new NoPendingOtpError();
  }

  const credential = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;

  return getIdToken(credential.user);
}
