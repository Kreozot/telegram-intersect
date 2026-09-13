import type { LoginStage } from "../../shared/contracts.js";

const ACTIVE_LOGIN_STAGES: ReadonlySet<LoginStage> = new Set([
  "connecting",
  "phone",
  "code",
  "password",
  "qr",
]);

/** Limits fallback polling to interactive login; scan and avatar changes arrive through SSE. */
export function shouldPollWorkspace(authenticated: boolean, loginStage: LoginStage): boolean {
  return authenticated && ACTIVE_LOGIN_STAGES.has(loginStage);
}
