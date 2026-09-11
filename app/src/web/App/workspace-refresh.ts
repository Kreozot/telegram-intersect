import type { LoginStage, Scan } from "../../shared/contracts.js";

const ACTIVE_LOGIN_STAGES: ReadonlySet<LoginStage> = new Set([
  "connecting",
  "phone",
  "code",
  "password",
  "qr",
]);

/** Determines whether server-side login or scan work can currently change without a browser command. */
export function shouldPollWorkspace(
  authenticated: boolean,
  loginStage: LoginStage,
  scan: Scan | null,
): boolean {
  return authenticated && (ACTIVE_LOGIN_STAGES.has(loginStage) || scan?.running === true);
}
