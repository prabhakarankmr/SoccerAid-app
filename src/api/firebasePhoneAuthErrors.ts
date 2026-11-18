/**
 * Thrown by confirmOtp() when no sendOtp() call is still active for this session — the
 * in-memory confirmation handle (module-level, not React state) was lost, e.g. a browser
 * refresh or (on web, in dev) Metro Fast Refresh re-evaluating firebasePhoneAuth.web.ts while
 * the OTP screen itself survives the reload. Distinct from "wrong code," which Firebase
 * reports differently (confirm() itself rejects) — this one means there's nothing to confirm
 * against at all, so retrying the same code can never work; the caller needs to request a new
 * one.
 */
export class NoPendingOtpError extends Error {
  constructor() {
    super('No OTP request in progress — go back and request a new code.');
    this.name = 'NoPendingOtpError';
  }
}
